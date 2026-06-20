import boto3
client = boto3.client('bedrock-runtime', region_name='us-east-1')
try:
    response = client.converse(
        modelId='meta.llama3-8b-instruct-v1:0',
        messages=[{'role': 'user', 'content': [{'text': 'Hi'}]}]
    )
    print("SUCCESS:", response['output']['message']['content'][0]['text'])
except Exception as e:
    print("ERROR:", e)
