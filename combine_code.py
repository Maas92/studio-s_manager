import fnmatch
import os
import sys


def combine_code(root_path, output_file="combined_code.txt", pattern=None):
    """
    Combine all code files from the specified directory into one file.

    Args:
        root_path: The directory to search through
        output_file: Name of the output file
        pattern: Wildcard pattern to filter files (e.g., '*schema*', '*.py', 'test_*.js')
                If None, all files with specified extensions are included
    """
    extensions = [".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json"]
    exclude_dirs = [
        "node_modules",
        ".git",
        "dist",
        "build",
        "__pycache__",
        ".next",
        "venv",
        "env",
    ]

    # Verify the path exists
    if not os.path.exists(root_path):
        print(f"Error: Path '{root_path}' does not exist!")
        return

    if not os.path.isdir(root_path):
        print(f"Error: '{root_path}' is not a directory!")
        return

    file_count = 0

    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write(f"Code combined from: {os.path.abspath(root_path)}\n")
        if pattern:
            outfile.write(f"Pattern filter: {pattern}\n")
        outfile.write(f"{'='*80}\n\n")

        for root, dirs, files in os.walk(root_path):
            # Remove excluded directories from the search
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                # Check if file matches extension requirement
                if any(file.endswith(ext) for ext in extensions):
                    # If pattern is specified, check if filename matches
                    if pattern and not fnmatch.fnmatch(file, pattern):
                        continue

                    filepath = os.path.join(root, file)
                    file_count += 1

                    outfile.write(f"\n\n{'='*80}\n")
                    outfile.write(f"FILE: {filepath}\n")
                    outfile.write(f"{'='*80}\n\n")

                    try:
                        with open(filepath, "r", encoding="utf-8") as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}\n")

    if file_count == 0:
        print(f"⚠ No files matched the criteria in '{root_path}'")
        if pattern:
            print(f"  Pattern used: {pattern}")
    else:
        print(f"✓ Successfully combined {file_count} files from '{root_path}'")
        if pattern:
            print(f"  Pattern used: {pattern}")
        print(f"✓ Output saved to: {output_file}")


if __name__ == "__main__":
    # Check if path was provided as command line argument
    if len(sys.argv) > 1:
        target_path = sys.argv[1]
        output_name = sys.argv[2] if len(sys.argv) > 2 else "combined_code.txt"
        file_pattern = sys.argv[3] if len(sys.argv) > 3 else None
    else:
        # Interactive mode - ask user for path
        print(
            "Enter the folder path to combine (e.g., ./backend, root/auth, or . for current directory):"
        )
        target_path = input("> ").strip()

        print("\nEnter output filename (press Enter for 'combined_code.txt'):")
        output_name = input("> ").strip() or "combined_code.txt"

        print("\nEnter wildcard pattern to filter files (press Enter for no filter):")
        print("Examples: *schema*, test_*.py, *config*.js")
        file_pattern = input("> ").strip() or None

    combine_code(target_path, output_name, file_pattern)
