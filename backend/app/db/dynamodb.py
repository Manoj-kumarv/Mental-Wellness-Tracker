"""
DynamoDB client and table helpers.

Single-table design with the following access patterns:

PK (partition key)   SK (sort key)         Entity
─────────────────    ──────────────────    ───────────────────────
USER#{user_id}       PROFILE              user profile
SESSION#{session_id} PROFILE              guest session
USER#{owner_id}      JOURNAL#{entry_id}   journal entry
USER#{owner_id}      MOOD#{log_id}        mood log
USER#{owner_id}      CHAT#{msg_id}        chat message
USER#{owner_id}      INSIGHT#{ts}         weekly insight

GSI-1  (query by email):
  PK = EMAIL#{email}  SK = USER#{user_id}

GSI-2  (query entries by date range):
  PK = OWNER#{owner_id}  SK = CREATED#{iso_timestamp}
"""
import logging
from functools import lru_cache
from typing import Any, Optional

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Tables:
    MAIN = f"{settings.DYNAMODB_TABLE_PREFIX}-main"


@lru_cache(maxsize=1)
def get_dynamodb_resource():
    """Return a cached DynamoDB resource. Uses IAM role in production."""
    kwargs: dict[str, Any] = {"region_name": settings.AWS_REGION}

    # Local dev: allow explicit credentials or local endpoint
    if settings.DYNAMODB_ENDPOINT:
        kwargs["endpoint_url"] = settings.DYNAMODB_ENDPOINT
    if settings.AWS_ACCESS_KEY_ID:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    return boto3.resource("dynamodb", **kwargs)


def get_table(table_name: str):
    """Return a DynamoDB Table resource."""
    return get_dynamodb_resource().Table(table_name)


def get_main_table():
    return get_table(Tables.MAIN)


# ─────────────────────────────────────────────────────────────────────────────
# Bootstrap — create table in local/dev if it doesn't exist
# ─────────────────────────────────────────────────────────────────────────────

def bootstrap_tables() -> None:
    """
    Create DynamoDB table with required GSIs if it doesn't exist.
    In production this is done via Terraform/CloudFormation — this runs
    only in development against DynamoDB Local or a fresh AWS account.
    """
    resource = get_dynamodb_resource()
    table_name = Tables.MAIN

    try:
        resource.meta.client.describe_table(TableName=table_name)
        logger.info(f"DynamoDB table '{table_name}' already exists.")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise

    logger.info(f"Creating DynamoDB table '{table_name}'...")
    resource.create_table(
        TableName=table_name,
        BillingMode="PAY_PER_REQUEST",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
            {"AttributeName": "GSI2PK", "AttributeType": "S"},
            {"AttributeName": "GSI2SK", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1-email-index",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "GSI2-owner-date-index",
                "KeySchema": [
                    {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI2SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    )
    resource.meta.client.get_waiter("table_exists").wait(TableName=table_name)
    logger.info(f"Table '{table_name}' created successfully.")
