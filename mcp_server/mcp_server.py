# mcp_server.py – Finance App MCP Server
# Purpose-built tools for developing D:\ai\finance-app
# Tools: file r/w/edit, run npm commands, read dev-server logs, check Next.js routes

import os, sys, json, logging, asyncio, subprocess
from pathlib import Path
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR   = Path(r"D:\ai\finance-app")
LOG_FILE   = Path(__file__).parent / "mcp_server.log"
NODE_CMD   = "node"
NPM_CMD    = "npm"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(str(LOG_FILE), encoding="utf-8")],
)
log = logging.getLogger("finance-app-mcp")
log.info("=== finance-app MCP server starting ===")
log.info(f"Base directory: {BASE_DIR}")

# ── Safety helper ──────────────────────────────────────────────────────────────
def _safe_path(rel: str) -> Path:
    """Resolve a relative path under BASE_DIR, blocking traversal attacks."""
    rel = rel.replace("\\", "/").strip("/")
    if ".." in rel.split("/"):
        raise ValueError("Path traversal ('..') not allowed.")
    resolved = (BASE_DIR / rel).resolve()
    if not str(resolved).startswith(str(BASE_DIR.resolve())):
        raise ValueError(f"Path escapes base directory: {resolved}")
    return resolved

# ── Async subprocess helper ────────────────────────────────────────────────────
async def _run(cmd: str, cwd: Path, timeout: int = 60, env: dict = None) -> dict:
    merged_env = {**os.environ, **(env or {})}
    proc = await asyncio.create_subprocess_shell(
        cmd,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=merged_env,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        return {"return_code": -1, "stdout": "", "stderr": f"Timed out after {timeout}s"}
    return {
        "return_code": proc.returncode,
        "stdout": stdout.decode("utf-8", errors="replace"),
        "stderr": stderr.decode("utf-8", errors="replace"),
    }

# ── MCP Server ─────────────────────────────────────────────────────────────────
server = Server("finance-app")

def T(name, desc, props=None, req=None):
    schema = {"type": "object", "properties": props or {}}
    if req:
        schema["required"] = req
    return types.Tool(name=name, description=desc, inputSchema=schema)

@server.list_tools()
async def list_tools():
    return [

        # ── File operations ──────────────────────────────────────────────────
        T(
            "read_file",
            "Read a source file from the finance-app project. "
            "Use for inspecting TypeScript, CSS, config, or any text file.",
            {
                "path":       {"type": "string",  "description": "Relative path from project root (e.g. 'src/app/page.tsx')"},
                "line_start": {"type": "integer", "description": "First line to read (1-based). Optional."},
                "line_end":   {"type": "integer", "description": "Last line to read (inclusive). Optional."},
                "max_chars":  {"type": "integer", "description": "Max characters to return. Default: 50000"},
            },
            req=["path"],
        ),

        T(
            "write_file",
            "Write or overwrite a source file in the finance-app project. "
            "Creates parent directories automatically. Use for creating or fully replacing files.",
            {
                "path":    {"type": "string", "description": "Relative path from project root"},
                "content": {"type": "string", "description": "Full file content to write"},
            },
            req=["path", "content"],
        ),

        T(
            "edit_file",
            "Find-and-replace text inside a file. Safer than write_file for small edits "
            "because it preserves everything outside the changed section.",
            {
                "path":        {"type": "string",  "description": "Relative path from project root"},
                "old_text":    {"type": "string",  "description": "Exact text to find (must be unique in the file)"},
                "new_text":    {"type": "string",  "description": "Replacement text"},
                "replace_all": {"type": "boolean", "description": "Replace all occurrences? Default: false (first only)"},
            },
            req=["path", "old_text", "new_text"],
        ),

        T(
            "list_files",
            "List files in a directory of the finance-app project. "
            "Useful for checking what exists before reading or writing.",
            {
                "path":      {"type": "string",  "description": "Relative directory path. Default: '' (project root)"},
                "recursive": {"type": "boolean", "description": "List recursively up to 4 levels deep. Default: false"},
                "pattern":   {"type": "string",  "description": "Glob filter e.g. '*.ts', '*.tsx'. Default: all files"},
            },
        ),

        # ── npm / Next.js dev ────────────────────────────────────────────────
        T(
            "npm_install",
            "Run 'npm install' in the finance-app project root to install or update dependencies. "
            "Also accepts a package name to install a specific package.",
            {
                "package": {"type": "string", "description": "Optional package name (e.g. 'zod') to add. Omit to install all from package.json."},
                "dev":     {"type": "boolean", "description": "Install as devDependency? Default: false"},
            },
        ),

        T(
            "npm_run",
            "Run an npm script (e.g. 'build', 'lint', 'type-check') in the finance-app project. "
            "Do NOT use for 'dev' (use start_dev_server instead).",
            {
                "script":  {"type": "string",  "description": "Script name from package.json scripts"},
                "timeout": {"type": "integer", "description": "Timeout seconds. Default: 60"},
            },
            req=["script"],
        ),

        T(
            "start_dev_server",
            "Start the Next.js dev server in the background (npm run dev). "
            "Returns immediately — use read_dev_server_log to check startup status.",
            {
                "port": {"type": "integer", "description": "Port to run on. Default: 3000"},
            },
        ),

        T(
            "stop_dev_server",
            "Stop the background Next.js dev server started by start_dev_server.",
            {},
        ),

        T(
            "read_dev_server_log",
            "Read the tail of the dev server log to check for startup errors, "
            "compilation errors, or route warnings.",
            {
                "lines": {"type": "integer", "description": "Number of lines from the end to return. Default: 50"},
            },
        ),

        # ── HTTP testing ─────────────────────────────────────────────────────
        T(
            "http_get",
            "Send a GET request to the running dev server and return the response. "
            "Use to verify a page or API route returns the expected output.",
            {
                "path":    {"type": "string",  "description": "URL path e.g. '/api/analyze' or '/'"},
                "port":    {"type": "integer", "description": "Port the dev server is on. Default: 3000"},
                "timeout": {"type": "integer", "description": "Timeout seconds. Default: 10"},
            },
            req=["path"],
        ),

        T(
            "http_post",
            "Send a POST request with a JSON body to the running dev server. "
            "Use to test API routes like /api/analyze.",
            {
                "path":    {"type": "string",  "description": "URL path e.g. '/api/analyze'"},
                "body":    {"type": "object",  "description": "JSON body to send"},
                "port":    {"type": "integer", "description": "Port the dev server is on. Default: 3000"},
                "timeout": {"type": "integer", "description": "Timeout seconds. Default: 30"},
            },
            req=["path", "body"],
        ),

        # ── Project inspection ───────────────────────────────────────────────
        T(
            "check_types",
            "Run TypeScript type-checking (tsc --noEmit) and return any type errors. "
            "Fast way to catch bugs without a full build.",
            {},
        ),

        T(
            "read_package_json",
            "Read and parse the current package.json. "
            "Useful for checking installed dependencies and available scripts.",
            {},
        ),

        T(
            "get_project_tree",
            "Return the full file tree of the finance-app project (src/ only, max 4 levels). "
            "Good for getting an overview before making changes.",
            {},
        ),
    ]


# ── Dev server process registry ────────────────────────────────────────────────
_dev_server_proc: asyncio.subprocess.Process | None = None
_dev_log_path = Path(__file__).parent / "dev_server.log"


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        return await _dispatch(name, arguments)
    except Exception as e:
        log.error(f"Tool '{name}' failed: {e}", exc_info=True)
        return [types.TextContent(type="text", text=f"Error in '{name}': {e}")]


async def _dispatch(name: str, arguments: dict):
    global _dev_server_proc

    # ── read_file ──────────────────────────────────────────────────────────
    if name == "read_file":
        path = _safe_path(arguments["path"])
        if not path.is_file():
            return [types.TextContent(type="text", text=f"File not found: {arguments['path']}")]
        content = path.read_text(encoding="utf-8", errors="replace")
        ls, le = arguments.get("line_start"), arguments.get("line_end")
        if ls or le:
            lines = content.splitlines(keepends=True)
            content = "".join(lines[(ls or 1) - 1 : le])
        max_chars = arguments.get("max_chars", 50000)
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n... [truncated at {max_chars} chars]"
        return [types.TextContent(type="text", text=content)]

    # ── write_file ─────────────────────────────────────────────────────────
    elif name == "write_file":
        path = _safe_path(arguments["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(arguments["content"], encoding="utf-8")
        size = path.stat().st_size
        log.info(f"Wrote {arguments['path']} ({size} bytes)")
        return [types.TextContent(type="text", text=f"Wrote {arguments['path']} ({size} bytes)")]

    # ── edit_file ──────────────────────────────────────────────────────────
    elif name == "edit_file":
        path = _safe_path(arguments["path"])
        if not path.is_file():
            return [types.TextContent(type="text", text=f"File not found: {arguments['path']}")]
        content = path.read_text(encoding="utf-8")
        old, new = arguments["old_text"], arguments["new_text"]
        if old not in content:
            return [types.TextContent(type="text", text="old_text not found in file — no changes made.")]
        count = content.count(old) if arguments.get("replace_all") else 1
        content = content.replace(old, new) if arguments.get("replace_all") else content.replace(old, new, 1)
        path.write_text(content, encoding="utf-8")
        log.info(f"Edited {arguments['path']}: replaced {count} occurrence(s)")
        return [types.TextContent(type="text", text=f"Replaced {count} occurrence(s) in {arguments['path']}")]

    # ── list_files ─────────────────────────────────────────────────────────
    elif name == "list_files":
        rel = arguments.get("path", "")
        target = _safe_path(rel) if rel else BASE_DIR
        if not target.exists():
            return [types.TextContent(type="text", text=f"Directory not found: {rel or 'root'}")]
        pattern   = arguments.get("pattern", "*")
        recursive = arguments.get("recursive", False)
        items = []
        glob_fn = target.rglob if recursive else target.glob
        for p in sorted(glob_fn(pattern)):
            depth = len(p.relative_to(target).parts)
            if recursive and depth > 4:
                continue
            try:
                stat = p.stat()
                items.append({
                    "name": str(p.relative_to(target)),
                    "type": "dir" if p.is_dir() else "file",
                    "size": stat.st_size if p.is_file() else None,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
            except OSError:
                pass
        return [types.TextContent(type="text", text=json.dumps({"path": rel or ".", "count": len(items), "items": items}))]

    # ── npm_install ────────────────────────────────────────────────────────
    elif name == "npm_install":
        pkg = arguments.get("package", "")
        dev = arguments.get("dev", False)
        if pkg:
            cmd = f"npm install {'--save-dev ' if dev else ''}{pkg}"
        else:
            cmd = "npm install"
        result = await _run(cmd, BASE_DIR, timeout=120)
        out = (result["stdout"] + result["stderr"]).strip()[-3000:]
        return [types.TextContent(type="text", text=f"Exit {result['return_code']}\n{out}")]

    # ── npm_run ────────────────────────────────────────────────────────────
    elif name == "npm_run":
        script  = arguments["script"]
        timeout = arguments.get("timeout", 60)
        result  = await _run(f"npm run {script}", BASE_DIR, timeout=timeout)
        out     = (result["stdout"] + result["stderr"]).strip()[-4000:]
        return [types.TextContent(type="text", text=f"Exit {result['return_code']}\n{out}")]

    # ── start_dev_server ───────────────────────────────────────────────────
    elif name == "start_dev_server":
        if _dev_server_proc and _dev_server_proc.returncode is None:
            return [types.TextContent(type="text", text="Dev server is already running.")]
        port = arguments.get("port", 3000)
        log_f = open(str(_dev_log_path), "w", encoding="utf-8")
        _dev_server_proc = await asyncio.create_subprocess_shell(
            f"npm run dev -- --port {port}",
            cwd=str(BASE_DIR),
            stdout=log_f,
            stderr=log_f,
            env={**os.environ},
        )
        log.info(f"Dev server started (PID {_dev_server_proc.pid}) on port {port}")
        return [types.TextContent(type="text", text=f"Dev server started (PID {_dev_server_proc.pid}) on port {port}. Use read_dev_server_log to check status.")]

    # ── stop_dev_server ────────────────────────────────────────────────────
    elif name == "stop_dev_server":
        if not _dev_server_proc or _dev_server_proc.returncode is not None:
            return [types.TextContent(type="text", text="Dev server is not running.")]
        _dev_server_proc.terminate()
        try:
            await asyncio.wait_for(_dev_server_proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            _dev_server_proc.kill()
        log.info("Dev server stopped")
        return [types.TextContent(type="text", text="Dev server stopped.")]

    # ── read_dev_server_log ────────────────────────────────────────────────
    elif name == "read_dev_server_log":
        if not _dev_log_path.exists():
            return [types.TextContent(type="text", text="No dev server log found. Start the dev server first.")]
        lines = int(arguments.get("lines", 50))
        all_lines = _dev_log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        tail = "\n".join(all_lines[-lines:])
        return [types.TextContent(type="text", text=tail or "(log is empty)")]

    # ── http_get ───────────────────────────────────────────────────────────
    elif name == "http_get":
        port    = arguments.get("port", 3000)
        timeout = arguments.get("timeout", 10)
        url     = f"http://localhost:{port}{arguments['path']}"
        result  = await _run(
            f'node -e "const h=require(\'http\');h.get(\'{url}\',r=>{{let d=\'\';r.on(\'data\',c=>d+=c);r.on(\'end\',()=>{{console.log(\'STATUS:\',r.statusCode);console.log(d.slice(0,3000))}})}})"',
            BASE_DIR, timeout=timeout,
        )
        out = (result["stdout"] + result["stderr"]).strip()
        return [types.TextContent(type="text", text=out or f"No response (exit {result['return_code']})")]

    # ── http_post ──────────────────────────────────────────────────────────
    elif name == "http_post":
        port    = arguments.get("port", 3000)
        timeout = arguments.get("timeout", 30)
        url     = f"http://localhost:{port}{arguments['path']}"
        body    = json.dumps(arguments["body"]).replace("'", "\\'")
        js = (
            "const h=require('http'),b=JSON.stringify(" + json.dumps(arguments["body"]) + ");"
            "const o={hostname:'localhost',port:" + str(port) + ",path:'" + arguments['path'] + "',"
            "method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}};"
            "const r=h.request(o,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log('STATUS:',res.statusCode);console.log(d.slice(0,4000))})});"
            "r.on('error',e=>console.error(e.message));r.write(b);r.end();"
        )
        result = await _run(f"node -e \"{js}\"", BASE_DIR, timeout=timeout)
        out = (result["stdout"] + result["stderr"]).strip()
        return [types.TextContent(type="text", text=out or f"No response (exit {result['return_code']})")]

    # ── check_types ────────────────────────────────────────────────────────
    elif name == "check_types":
        result = await _run("npx tsc --noEmit", BASE_DIR, timeout=60)
        out = (result["stdout"] + result["stderr"]).strip()
        if result["return_code"] == 0:
            return [types.TextContent(type="text", text="No type errors found.")]
        return [types.TextContent(type="text", text=out[-4000:])]

    # ── read_package_json ──────────────────────────────────────────────────
    elif name == "read_package_json":
        pkg_path = BASE_DIR / "package.json"
        if not pkg_path.exists():
            return [types.TextContent(type="text", text="package.json not found.")]
        return [types.TextContent(type="text", text=pkg_path.read_text(encoding="utf-8"))]

    # ── get_project_tree ───────────────────────────────────────────────────
    elif name == "get_project_tree":
        src = BASE_DIR / "src"
        if not src.exists():
            return [types.TextContent(type="text", text="src/ directory not found.")]

        def _tree(path: Path, prefix: str = "", depth: int = 0) -> list[str]:
            if depth > 4:
                return []
            entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name))
            lines = []
            for i, entry in enumerate(entries):
                connector = "└── " if i == len(entries) - 1 else "├── "
                lines.append(prefix + connector + entry.name)
                if entry.is_dir():
                    extension = "    " if i == len(entries) - 1 else "│   "
                    lines.extend(_tree(entry, prefix + extension, depth + 1))
            return lines

        root_files = [f.name for f in sorted(BASE_DIR.iterdir()) if f.is_file() and f.name not in ("package-lock.json",)]
        tree_lines = ["finance-app/", "├── " + "\n├── ".join(root_files), "└── src/"]
        tree_lines += _tree(src, "    ")
        return [types.TextContent(type="text", text="\n".join(tree_lines))]

    else:
        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]


# ── Entry point ────────────────────────────────────────────────────────────────
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
