import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  BookmarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  useSavedFiles,
  useUploadSavedFile,
  useDeleteSavedFile,
  getSavedFileDownloadUrl,
} from "../../api/saved-files";
import apiClient from "../../api/client";

const CATEGORY = "interactive_bom";

export default function InteractiveBOM() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: savedFiles, isLoading: loadingSaved } = useSavedFiles(CATEGORY);
  const saveMutation = useUploadSavedFile();
  const deleteMutation = useDeleteSavedFile();

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const loadHtmlContent = useCallback(
    (html: string, name: string) => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const blob = new Blob([html], { type: "text/html" });
      setBlobUrl(URL.createObjectURL(blob));
      setFileName(name);
    },
    [blobUrl]
  );

  const handleFile = useCallback(
    (file: File) => {
      setCurrentFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        loadHtmlContent(reader.result as string, file.name);
      };
      reader.readAsText(file);
    },
    [loadHtmlContent]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".html")) handleFile(file);
    },
    [handleFile]
  );

  const handleSave = async () => {
    if (!currentFile) {
      toast.error("No file loaded to save.");
      return;
    }
    const name = prompt("Name for this BOM file:", currentFile.name);
    if (!name) return;

    try {
      await saveMutation.mutateAsync({
        file: currentFile,
        name,
        category: CATEGORY,
      });
      toast.success("BOM file saved.");
    } catch {
      // handled by client interceptor
    }
  };

  const handleLoadSaved = async (id: number, originalName: string) => {
    try {
      const url = getSavedFileDownloadUrl(id);
      const { data } = await apiClient.get<string>(url, { responseType: "text" as never });
      loadHtmlContent(data, originalName);
      setCurrentFile(null); // loaded from server, not a local File
      setShowSaved(false);
      toast.success(`Loaded "${originalName}"`);
    } catch {
      toast.error("Failed to load file.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this saved file?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("File deleted.");
    } catch {
      // handled
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          Upload BOM (.html)
        </button>

        <button
          onClick={() => setShowSaved(!showSaved)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <FolderOpenIcon className="h-4 w-4" />
          Saved Files
          {savedFiles && savedFiles.total > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
              {savedFiles.total}
            </span>
          )}
        </button>

        {fileName && (
          <>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5 ml-2">
              <DocumentIcon className="h-4 w-4" />
              {fileName}
            </span>
            {currentFile && (
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <BookmarkIcon className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </button>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".html"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Saved files sidebar */}
        {showSaved && (
          <div className="w-72 border-r bg-background overflow-y-auto shrink-0">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold text-foreground">Saved BOM Files</h3>
            </div>
            {loadingSaved ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : !savedFiles?.items.length ? (
              <div className="p-4 text-sm text-muted-foreground">
                No saved files yet. Upload a BOM and click Save.
              </div>
            ) : (
              <div className="divide-y">
                {savedFiles.items.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleLoadSaved(f.id, f.original_filename)}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {f.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.original_filename}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatSize(f.file_size)}
                          {f.created_at &&
                            ` · ${format(new Date(f.created_at), "MMM d, yyyy")}`}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`${apiClient.defaults.baseURL}/saved-files/${f.id}/download`}
                          download
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(f.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viewer area */}
        {blobUrl ? (
          <iframe
            src={blobUrl}
            className="flex-1 w-full border-0"
            title="Interactive BOM Viewer"
          />
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="text-center max-w-md space-y-4 p-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <DocumentIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Interactive BOM Viewer
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload an Interactive BOM HTML file generated by JLCPCB/EasyEDA's
                SMT assembly tool. The file will be rendered fully functional
                inside the platform.
              </p>
              <p className="text-xs text-muted-foreground">
                Drag & drop an .html file here, or click the upload button above.
                {savedFiles && savedFiles.total > 0 && (
                  <>
                    {" "}You have{" "}
                    <button
                      onClick={() => setShowSaved(true)}
                      className="underline text-primary"
                    >
                      {savedFiles.total} saved file{savedFiles.total > 1 ? "s" : ""}
                    </button>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
