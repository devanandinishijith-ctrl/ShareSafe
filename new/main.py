from dotenv import load_dotenv
import os

load_dotenv()

print(os.getcwd())

name = os.getenv("NAME")
name = input("Enter name:")

if name ==os.getenv("NAME"):
    print("Verified user")
else:
    print("Unverified user")