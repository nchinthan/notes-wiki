import struct
import os

CHUNK_SIZE = 1024  # Fixed chunk size

def create_file(filename):
    open(f"{filename}.notes",'w+').close()

def read_file(filename):
    """Read title and full content from a .notes file."""
    with open(f"{filename}.notes", "rb") as f:
        # Remaining bytes are content
        content = f.read().decode("utf-8",errors='ignore')
    return content

def write_chunk(filename, chunk_content:str, chunk_index):
    """
    Write a chunk at a specific index (overwrites existing data).
    chunk_content must be <= CHUNK_SIZE bytes.
    """
    if len(chunk_content) > CHUNK_SIZE:
        raise ValueError(f"Chunk size exceeds {CHUNK_SIZE} bytes")
    
    with open(f"{filename}.notes", "r+b") as f:  # Read+write binary mode
        # Seek to chunk position
        f.seek(chunk_index * CHUNK_SIZE, os.SEEK_SET)
        # Write chunk 
        f.write(chunk_content.encode("utf-8",errors='ignore'))

def delete_file(filename):
    filename = os.path.join(os.getcwd(),filename) + ".notes"
    if not os.path.exists(filename):
        return False 
    os.remove(filename)
    return True
