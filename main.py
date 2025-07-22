from fastapi import FastAPI, Request
from pydantic import BaseModel
from model import generate_response

app = FastAPI()

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 50

@app.post("/chat")
async def chat(request: PromptRequest):
    response = generate_response(request.prompt, max_new_tokens=request.max_tokens)
    return {"response": response}
