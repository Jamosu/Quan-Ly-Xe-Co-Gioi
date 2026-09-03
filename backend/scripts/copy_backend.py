import shutil
import os

src = r"D:\ThacoAgri_Code\pm-Quan-li-xe-co-gioi\backend"
dst = r"D:\ThacoAgri_Code\Mockup\backend"

os.makedirs(dst, exist_ok=True)

items_to_copy = [
    "src", "prisma", "package.json", "package-lock.json",
    "tsconfig.json", "nest-cli.json", ".env", ".env.example", "README.md"
]

for item in items_to_copy:
    s = os.path.join(src, item)
    d = os.path.join(dst, item)
    if os.path.isdir(s):
        if os.path.exists(d):
            shutil.rmtree(d)
        shutil.copytree(s, d)
        print(f"Copied directory: {item}")
    elif os.path.isfile(s):
        shutil.copy2(s, d)
        print(f"Copied file: {item}")

print("All backend files copied successfully to Mockup/backend!")
