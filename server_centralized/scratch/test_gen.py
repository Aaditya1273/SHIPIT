
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

model_name = 'gemini-2.5-flash-lite'
model = genai.GenerativeModel(model_name)

prompt = "Generate a JSON object with one key 'test' and value 'success'."

try:
    print(f"Testing generate_content with {model_name}...")
    # Try with and without response_mime_type
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        print(f"Success with JSON mode: {response.text}")
    except Exception as e:
        print(f"Failed with JSON mode: {e}")
        
    try:
        response = model.generate_content(prompt)
        print(f"Success without JSON mode: {response.text}")
    except Exception as e:
        print(f"Failed without JSON mode: {e}")
        
except Exception as e:
    print(f"General error: {e}")
