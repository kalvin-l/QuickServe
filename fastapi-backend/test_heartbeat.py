from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
sys.path.insert(0, '.')

app = FastAPI()

class HeartbeatRequest(BaseModel):
    device_id: str

@app.post("/test_heartbeat")
async def test_heartbeat(request: HeartbeatRequest):
    print(f"Received heartbeat from {request.device_id}")
    return {"success": True, "device_id": request.device_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
