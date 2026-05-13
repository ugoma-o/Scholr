# Scholr

Scholr is an AI study intelligence app with two modes:

1. Socratic Examiner: challenges the user with targeted questions from pasted study material.
2. Teach Mode: lets the user teach material section by section to an AI student.

## Tech stack

- Static HTML/CSS/JavaScript frontend
- Vercel serverless API route
- Hugging Face Inference Providers router
- Model: Qwen/Qwen2.5-7B-Instruct

## Environment variables

Set this in Vercel:

```txt
HUGGING_FACE_API_KEY=your_hugging_face_token
