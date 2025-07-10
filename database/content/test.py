from notes_io import create_file, write_chunk, read_file,CHUNK_SIZE
import random

def test_notes_file():
    filename = "testfile"
    title = "My Notes File"
    create_file(filename, title)
    
    def random_str(l):
        s = str(random.randbytes(l))[2:l+2]
        return s

    # Step 1: Write 10 chunks
    original_chunks = list()
    for i in range(9):
        chunk = random_str(CHUNK_SIZE)
        write_chunk(filename, chunk, i)
        original_chunks.append(chunk)
    # last chunk is less than CHunk size 
    chunk = random_str(random.randint(0,500))
    original_chunks.append(chunk)
    write_chunk(filename,chunk,9)

    # Step 2: Overwrite some chunks with new content
    for i in range(random.randint(1,4)):
        chunk_id = random.randint(0,6)
        chunk = random_str(CHUNK_SIZE)
        write_chunk(filename, chunk, chunk_id)
        original_chunks[chunk_id] = chunk

    # Step 3: Read full file
    res = read_file(filename)
    read_title = res["title"]
    read_content = res["html"]

    # Step 4: Construct expected content
    expected_content = ''.join(original_chunks)

    # Step 5: Validation
    assert read_title == title, f"Title mismatch: {read_title} != {title}"
    assert expected_content == read_content
    
    print("✅ All tests passed.")

if __name__ == "__main__":
    test_notes_file()
    