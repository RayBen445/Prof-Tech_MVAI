from transformers import pipeline

# Load GPT-2 model only once
generator = pipeline("text-generation", model="gpt2")

def generate_response(prompt: str, max_new_tokens: int = 50) -> str:
    result = generator(prompt, max_new_tokens=max_new_tokens, do_sample=True)
    return result[0]["generated_text"]
