async function openSchemaFolder() {
  if (!window.showDirectoryPicker) {
    throw new Error("File System Access API is unavailable in this browser.");
  }

  const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  return directoryHandle;
}

async function readTextFromFileHandle(fileHandle) {
  const file = await fileHandle.getFile();
  return file.text();
}

async function readMarkdownFiles(directoryHandle) {
  const entries = [];

  async function walk(dirHandle, pathParts = []) {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === "directory") {
        await walk(handle, [...pathParts, name]);
        continue;
      }

      if (handle.kind === "file" && /\.md$/i.test(name)) {
        const content = await readTextFromFileHandle(handle);
        entries.push({
          name,
          path: [...pathParts, name].join("/"),
          handle,
          content
        });
      }
    }
  }

  await walk(directoryHandle);
  return entries;
}

async function writeMarkdownFile(fileHandle, markdownText) {
  const writable = await fileHandle.createWritable();
  await writable.write(markdownText);
  await writable.close();
}

window.FileSystemBridge = {
  openSchemaFolder,
  readMarkdownFiles,
  writeMarkdownFile
};
