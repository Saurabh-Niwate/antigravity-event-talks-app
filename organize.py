import os
import shutil

# Target directories
IMAGES_DIR = "Images"
DOCUMENTS_DIR = "Documents"
VIDEOS_DIR = "Videos"

# Extensions mapping
EXTENSIONS = {
    ".jpg": IMAGES_DIR,
    ".jpeg": IMAGES_DIR,
    ".gif": IMAGES_DIR,
    ".txt": DOCUMENTS_DIR,
    ".mp4": VIDEOS_DIR
}

def organize_files(directory="."):
    print(f"Scanning directory: {os.path.abspath(directory)}")
    
    # Ensure target directories exist
    for folder in [IMAGES_DIR, DOCUMENTS_DIR, VIDEOS_DIR]:
        if not os.path.exists(folder):
            os.makedirs(folder)
            print(f"Created directory: {folder}")

    moved_count = 0
    # Walk through files in the current folder (non-recursive to avoid touching dependencies/venv)
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        
        # Skip directories
        if os.path.isdir(filepath):
            continue
            
        # Extract extension and match
        _, ext = os.path.splitext(filename.lower())
        if ext in EXTENSIONS:
            dest_dir = EXTENSIONS[ext]
            dest_path = os.path.join(dest_dir, filename)
            
            # Resolve name conflicts if file already exists in destination
            base, ext_orig = os.path.splitext(filename)
            counter = 1
            while os.path.exists(dest_path):
                dest_path = os.path.join(dest_dir, f"{base}_{counter}{ext_orig}")
                counter += 1
                
            try:
                shutil.move(filepath, dest_path)
                print(f"Moved: {filename} -> {dest_path}")
                moved_count += 1
            except Exception as e:
                print(f"Error moving {filename}: {e}")
                
    if moved_count == 0:
        print("No matching files (.jpg, .jpeg, .gif, .txt, .mp4) found to organize in the root folder.")
    else:
        print(f"Successfully organized {moved_count} files.")

if __name__ == "__main__":
    organize_files()
