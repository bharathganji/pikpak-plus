export function WebDAVUsageInstructions() {
  return (
    <div className="mt-4 p-4 rounded-lg border bg-muted/30">
      <h4 className="font-medium mb-2 text-sm">How to connect?</h4>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>Open your WebDAV client (Raidrive, VLC, Infuse, etc.)</li>
        <li>Enter the Server URL shown above</li>
        <li>Choose any client and use its username and password</li>
        <li>Browse and download freely!</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-3">
        💡 All clients provide access to the same files. Choose any planet you
        like!
      </p>
    </div>
  );
}
