import tkinter as tk
from tkinter import ttk, messagebox
import urllib.request
import json
from datetime import datetime

API_URL = "http://localhost:8000/api/observations"

class CameraSimulator(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Camera Observation Simulator")
        self.geometry("400x350")
        self.configure(padx=20, pady=20)
        
        ttk.Label(self, text="Camera Simulator", font=("Helvetica", 16, "bold")).pack(pady=(0, 20))
        
        # Camera ID
        frame_cam = ttk.Frame(self)
        frame_cam.pack(fill=tk.X, pady=5)
        ttk.Label(frame_cam, text="Camera ID:", width=15).pack(side=tk.LEFT)
        self.cam_var = tk.StringVar(value="C01")
        ttk.Combobox(frame_cam, textvariable=self.cam_var, values=["C01", "C02", "C03", "C04", "C05"]).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Zone ID
        frame_zone = ttk.Frame(self)
        frame_zone.pack(fill=tk.X, pady=5)
        ttk.Label(frame_zone, text="Zone ID:", width=15).pack(side=tk.LEFT)
        self.zone_var = tk.StringVar(value="C")
        # Assuming zones A-T
        zones = [chr(i) for i in range(ord('A'), ord('T')+1)]
        ttk.Combobox(frame_zone, textvariable=self.zone_var, values=zones).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Buttons
        btn_frame = ttk.Frame(self)
        btn_frame.pack(fill=tk.BOTH, expand=True, pady=20)
        
        ttk.Button(btn_frame, text="Human Detected", command=lambda: self.send_observation("human_detected")).pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame, text="Movement Detected", command=lambda: self.send_observation("movement_detected")).pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame, text="Animal Detected", command=lambda: self.send_observation("animal_detected")).pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame, text="No Activity", command=lambda: self.send_observation("no_activity")).pack(fill=tk.X, pady=2)

        self.status_var = tk.StringVar(value="Status: Ready")
        ttk.Label(self, textvariable=self.status_var, font=("Helvetica", 9, "italic")).pack(side=tk.BOTTOM, pady=5)

    def send_observation(self, observation):
        data = {
            "source": "camera",
            "camera_id": self.cam_var.get(),
            "zone_id": self.zone_var.get(),
            "observation": observation,
            "timestamp": datetime.now().isoformat()
        }
        
        req = urllib.request.Request(API_URL, method="POST")
        req.add_header('Content-Type', 'application/json')
        jsondata = json.dumps(data).encode('utf-8')
        
        try:
            with urllib.request.urlopen(req, data=jsondata) as response:
                if response.status == 200:
                    self.status_var.set(f"Status: Sent {observation} from {self.cam_var.get()} at Zone {self.zone_var.get()}")
                else:
                    self.status_var.set(f"Status: Error {response.status}")
        except Exception as e:
            self.status_var.set(f"Status: Failed to connect to server.")
            messagebox.showerror("Connection Error", f"Could not connect to {API_URL}.\n{str(e)}")

if __name__ == "__main__":
    app = CameraSimulator()
    app.mainloop()
