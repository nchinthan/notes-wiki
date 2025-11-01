import socket
import argparse
import os 

def send_request(host, port, message):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # Connect to the server
            s.connect((host, port))
            print(f"Connected to server at {host}:{port}")
            
            # Send the message
            s.sendall(message.encode('utf-8'))
            
            # Receive the response
            response = s.recv(1024)  # Adjust buffer size as needed
            print(f"Received response: {response.decode('utf-8')}")
            
            return response.decode('utf-8')
            
        except ConnectionRefusedError:
            print(f"Could not connect to server at {host}:{port}")
        except Exception as e:
            print(f"Error during communication: {e}")

if __name__ == "__main__":
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Client to send requests to a server.')
    parser.add_argument('--port', type=int, required=True, help='Port number of the server')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host address of the server (default: 127.0.0.1)')
    #parser.add_argument('--message', type=str, required=True, help='Message to send to the server')
    
    args = parser.parse_args()
    
    
    loc = "..\database\content\pages"
    for file in os.listdir(loc):
        with open(os.path.join(loc,file),'r') as f:
            d = f.read()
        print(send_request(args.host, args.port, d))
        break 