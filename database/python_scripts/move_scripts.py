import shutil
import os

src = r"D:\ThacoAgri_Code\Mockup\python"
dst = r"D:\ThacoAgri_Code\Mockup\backend\scripts"

os.makedirs(dst, exist_ok=True)
for item in os.listdir(src):
    s = os.path.join(src, item)
    d = os.path.join(dst, item)
    if os.path.isfile(s):
        shutil.copy2(s, d)
        
print("Scripts copied into backend/scripts successfully!")
