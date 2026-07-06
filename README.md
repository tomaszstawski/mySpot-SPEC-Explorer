# mySpot SPEC Explorer

Interactive search, explorer, and documentation database for mySpot SPEC commands and macros.

## Features

*   **Segmented Owner Selector**: Switches views between all macros, Ivo's spec macros, and Chenghao's spec macros.
*   **Dynamic Stats**: Metrics in the dashboard update instantly based on the selected owner.
*   **Colour-Coded Badges**: Identifies the configuration source directories.
*   **Interactive Search**: Instantly filters the list. Search can be restricted to macro names, documentation comments, or the source code.
*   **Hierarchical File Sidebar**: Groups files by folder, showing badges representing the number of macros defined in each file.
*   **Lazy Code Highlighting**: Uses a custom SPEC syntax highlighter when displaying source code.
*   **Clipboard Integration**: Provides quick copy buttons on cards and inside the details modal.

## How to Access and Run the Application

### Option A: Open directly via Local File
Simply double-click the `index.html` file inside this folder or open it in your browser.

### Option B: Local Web Server
If you are running a local web server (such as Python's HTTP server), you can navigate to:
```
http://localhost:8080/spec_explorer/
```
