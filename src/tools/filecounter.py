import os
import csv


def get_file_extension(filename):
    """
    Return file extension in lowercase.
    Files without extension are reported as [NO_EXTENSION].
    """
    _, ext = os.path.splitext(filename)

    if ext:
        return ext.lower()

    return "[NO_EXTENSION]"


def scan_folders(root_folder):
    all_data = []
    all_extensions = set()

    # Walk through all folders
    for current_folder, subfolders, files in os.walk(root_folder):

        # Count files by extension
        extension_counts = {}

        for filename in files:
            extension = get_file_extension(filename)

            extension_counts[extension] = (
                extension_counts.get(extension, 0) + 1
            )

            all_extensions.add(extension)

        # Save folder information
        folder_data = {
            "path": current_folder,
            "file_count": len(files),
            "folder_count": len(subfolders),
            "extensions": extension_counts
        }

        all_data.append(folder_data)

    return all_data, sorted(all_extensions)


def save_csv(all_data, extensions, output_csv):

    # CSV header
    header = [
        "Folder Path",
        "File Count",
        "Folder Count"
    ]

    # Add one column for every extension
    header.extend(extensions)

    with open(
        output_csv,
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as csvfile:

        writer = csv.writer(csvfile)

        # Write header
        writer.writerow(header)

        # Write folder data
        for folder in all_data:

            row = [
                folder["path"],
                folder["file_count"],
                folder["folder_count"]
            ]

            # Add count for every extension
            for extension in extensions:
                count = folder["extensions"].get(extension, 0)
                row.append(count)

            writer.writerow(row)


def main():

    print("=" * 60)
    print("Folder File Analyzer")
    print("=" * 60)

    root_folder = input(
        "\nEnter the main folder path: "
    ).strip().strip('"')

    # Check folder
    if not os.path.isdir(root_folder):

        print("\nERROR: Folder does not exist!")

        input("\nPress Enter to exit...")
        return

    print("\nScanning folders...")

    # Scan
    all_data, extensions = scan_folders(root_folder)

    # Output CSV
    output_csv = os.path.join(
        root_folder,
        "folder_file_analysis.csv"
    )

    # Save
    save_csv(
        all_data,
        extensions,
        output_csv
    )

    # Result
    print("\n" + "=" * 60)
    print("SCAN COMPLETE")
    print("=" * 60)

    print(f"\nFolders scanned : {len(all_data)}")
    print(f"File extensions : {len(extensions)}")

    print("\nExtensions found:")

    for extension in extensions:
        print(f"  {extension}")

    print(f"\nCSV file:")
    print(output_csv)

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()