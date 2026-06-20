# MindEase Production Deployment Guide — AWS

This guide walks through deploying the MindEase application to **Amazon Web Services (AWS)** using standard production architecture.

---

## 🏗️ Production Architecture Reference
- **Frontend**: React (static build) hosted on S3 and distributed via **CloudFront** (CDN) with HTTPS handled by **ACM** (AWS Certificate Manager).
- **Backend**: FastAPI running on **AWS Elastic Beanstalk** (or direct EC2 instance) under an Application Load Balancer (ALB).
- **Database**: Single-table **Amazon DynamoDB** (On-Demand billing mode).
- **Storage**: Two **Amazon S3** buckets: one public (assets) and one private (secure uploads).
- **Security**: JWT secret managed by **AWS Secrets Manager**; permissions enforced via IAM Instance Profiles.
- **GenAI**: Models accessed through **AWS Bedrock** (Claude 3 Haiku / Amazon Titan).

---

## 📋 Phase 1: AWS Bedrock Activation
AWS Bedrock requires explicit model access activation before API calls are authorized.
1. Open the **AWS Bedrock Console**.
2. Make sure you are in the correct target region (e.g., `us-east-1` or `us-west-2` where Claude is supported).
3. In the left navigation pane, scroll to the bottom and select **Model access**.
4. Click **Manage model access** (top-right).
5. Select:
   - **Anthropic Claude 3 Haiku** (Default, highly cost-efficient)
   - **Anthropic Claude 3 Sonnet** (Rich analyses, optional)
   - **Amazon Titan Text G1 - Express** (Fallback model)
6. Click **Save changes** and wait a few minutes for the status to show *Access granted*.

---

## 🛠️ Phase 2: Deploy Infrastructure via CloudFormation
We provide a CloudFormation template in `deploy/cloudformation.yaml` to bootstrap all database tables, storage buckets, and IAM instance roles in one step.

1. Install and configure the [AWS CLI](https://aws.amazon.com/cli/).
2. Run the following command from the project root to deploy the stack:
   ```bash
   aws cloudformation create-stack \
     --stack-name mindease-production-infra \
     --template-body file://deploy/cloudformation.yaml \
     --capabilities CAPABILITY_IAM \
     --parameters ParameterKey=Environment,ParameterValue=production
   ```
3. Once completed (approx. 2 minutes), fetch outputs to see your bucket names and IAM instance profile:
   ```bash
   aws cloudformation describe-stacks --stack-name mindease-production-infra --query "Stacks[0].Outputs"
   ```

---

## 🔑 Phase 3: Secrets Configuration
Store the JWT signing key securely using **AWS Secrets Manager**:
1. Open the **Secrets Manager Console** or use the AWS CLI:
   ```bash
   aws secretsmanager create-secret \
     --name "mindease/jwt-secret-key" \
     --description "MindEase JWT Signing Key" \
     --secret-string '{"value": "generate-a-strong-random-32-byte-base64-string-here"}'
   ```
2. Note down the Secret ARN. The IAM policy attached to your compute instance is configured to access secrets with path prefix `mindease/*`.

---

## 🚀 Phase 4: Deploying Backend to Elastic Beanstalk
AWS Elastic Beanstalk is the easiest way to host FastAPI with automatic scaling and load balancing.

### 1. Initialize Elastic Beanstalk Application
Install the EB CLI (`pip install awsebcli`) and run:
```bash
cd backend
eb init -p python-3.11 mindease-backend
```

### 2. Configure Environment Properties
Create the environment and configure variables:
```bash
eb create mindease-prod-env \
  --instance-profile AppInstanceProfile-StackName \
  --envvars ENVIRONMENT=production,DEBUG=false,AWS_REGION=us-east-1,DYNAMODB_TABLE_PREFIX=mindease,S3_PRIVATE_BUCKET=mindease-private-bucket-name,S3_PUBLIC_BUCKET=mindease-public-bucket-name,BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0,USE_SECRETS_MANAGER=true,SECRET_NAME_JWT=mindease/jwt-secret-key,ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Deploy
Deploy the backend code:
```bash
eb deploy
```
Elastic Beanstalk will automatically use the `Procfile` in the backend folder to start the application with `uvicorn`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port 5000
```

---

## 🌐 Phase 5: Domain Setup and SSL Certificates (ACM)
Before hosting the frontend, request a secure SSL certificate:
1. Open the **AWS Certificate Manager (ACM)** console.
2. Request a public certificate for your domain:
   - Wildcard domain: `*.yourdomain.com`
   - Apex domain: `yourdomain.com`
3. Select **DNS validation** (recommended).
4. Add the generated CNAME records to Route 53 (if using AWS for domains) or your domain provider to validate ownership.

---

## 💻 Phase 6: Hosting the Frontend on S3 + CloudFront
To achieve maximum speed, cost efficiency, and security, host the static React build on S3 and distribute it via CloudFront.

### 1. Build the React SPA
Edit `frontend/.env` to point to your live Elastic Beanstalk backend URL (or ALB custom domain):
```env
VITE_API_URL=https://api.yourdomain.com
```
Then run build:
```bash
cd frontend
npm install
npm run build
```
This outputs a static distribution folder inside `frontend/dist`.

### 2. Upload to S3
Create a bucket for hosting (or use the one created by CloudFormation) and upload files:
```bash
aws s3 sync frontend/dist/ s3://mindease-public-bucket-name/ --delete
```

### 3. Create CloudFront Distribution
1. Go to **CloudFront Console** -> **Create Distribution**.
2. Set **Origin domain** to your S3 public bucket.
3. Choose **Origin access control (OAC)** to ensure users can only access the bucket through CloudFront, not S3 directly.
4. Set **Viewer protocol policy** to *Redirect HTTP to HTTPS*.
5. Set **Alternative domain names (CNAMEs)** to `yourdomain.com`.
6. Choose the **Custom SSL Certificate** created in Phase 5.
7. Under **Default Root Object**, enter `index.html`.
8. Under **Error pages** (custom error responses) add:
   - HTTP Error Code: `404: Not Found`
   - Customize Error Response: *Yes*
   - Response Page Path: `/index.html`
   - Response Code: `200: OK`
   *(This ensures client-side React Routing functions correctly).*
9. Click **Create Distribution**.

---

## 🗺️ Phase 7: Route 53 DNS Mapping
Point your custom domains to AWS:
1. Open the **Route 53 Console**.
2. Go to **Hosted zones** -> click your domain name.
3. Click **Create record**:
   - Record name: Leave blank (apex `yourdomain.com` or `www`).
   - Record type: `A` record.
   - Route traffic to: Choose **Alias to CloudFront distribution** -> select your distribution.
4. Create another record for the API:
   - Record name: `api` (e.g., `api.yourdomain.com`).
   - Record type: `A` record.
   - Route traffic to: Choose **Alias to Application Load Balancer** -> select your EB ALB.

Now, your application is fully deployed, optimized, secure, and live!
