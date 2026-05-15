
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

model_name = 'gemini-2.0-flash'
model = genai.GenerativeModel(model_name)

prompt = "Generate a JSON object with one key 'test' and value 'success'."

try:
    print(f"Testing generate_content with {model_name}...")
    response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
    print(f"Success: {response.text}")
except Exception as e:
    print(f"Failed: {e}")
