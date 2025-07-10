import struct
import os

CHUNK_SIZE = 1024  # Fixed chunk size

def create_file(filename, title):
    """Create a new .notes file with just the title."""
    with open(f"{filename}.notes", "wb") as f:
        title_encoded = title.encode("utf-8")
        f.write(struct.pack("<I", len(title_encoded)))  # 4-byte title length (little-endian)
        f.write(title_encoded)  # Title bytes

def read_file(filename):
    """Read title and full content from a .notes file."""
    with open(f"{filename}.notes", "rb") as f:
        # Read title_length (first 4 bytes)
        title_length = struct.unpack("<I", f.read(4))[0]
        # Read title (next `title_length` bytes)
        title = f.read(title_length).decode("utf-8")
        # Remaining bytes are content
        content = f.read().decode("utf-8")
    return {"title":title, "html":content}

def write_chunk(filename, chunk_content:str, chunk_index):
    """
    Write a chunk at a specific index (overwrites existing data).
    chunk_content must be <= CHUNK_SIZE bytes.
    """
    if len(chunk_content) > CHUNK_SIZE:
        raise ValueError(f"Chunk size exceeds {CHUNK_SIZE} bytes")
    
    with open(f"{filename}.notes", "r+b") as f:  # Read+write binary mode
        # Read title length (first 4 bytes)
        title_length = struct.unpack("<I", f.read(4))[0]

        # Seek to chunk position
        f.seek(title_length + chunk_index * CHUNK_SIZE, os.SEEK_CUR)
        # Write chunk (pad with zeros if smaller than CHUNK_SIZE)
        f.write(chunk_content.encode("utf-8"))
