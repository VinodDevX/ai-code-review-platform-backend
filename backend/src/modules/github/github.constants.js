const LLM_PROCESSING = "LLM_PROCESSING";
const REVIEW_CODE = "REVIEW_CODE";
const STATUS_ENUM = {
    PENDING: "PENDING",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
}

const AUTH_PROVIDERS = {
    GITHUB: "GITHUB"
}

// Comment prefix used to identify AI review comments
const AI_REVIEW_COMMENT_PREFIX = "AI review done up to commit: ";

// Separator for the summary section in review comments
const SUMMARY_SEPARATOR = "\n\n### AI Review Summary:\n";

// Maximum number of iterations for AI review process to prevent infinite loops
const MAX_REVIEW_ITERATIONS = 142;

// Maximum file size to review (in bytes)
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB

// Number of lines to include before and after the specified range in file content
const LINE_SPAN = 20;

 // Maximum number of entries in the file cache
const MAX_CACHE_ENTRIES = 1000;

const IGNORED_DIRECTORIES = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "coverage/",
    "vendor/",
    "target/"
];

const IGNORED_FILES = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml"
];

const ALLOWED_EXTENSIONS = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".cs",
    ".php",
    ".rb",
    ".swift",
    ".kt",
    ".kts",
    ".sql",
    ".html",
    ".css",
    ".scss",
    ".json",
    ".yaml",
    ".yml",
    ".md"
];

module.exports = {
    LLM_PROCESSING,
    AUTH_PROVIDERS,
    REVIEW_CODE,
    STATUS_ENUM,
    AI_REVIEW_COMMENT_PREFIX,
    SUMMARY_SEPARATOR,
    MAX_REVIEW_ITERATIONS,
    MAX_FILE_SIZE_BYTES,
    LINE_SPAN,
    MAX_CACHE_ENTRIES,
    IGNORED_DIRECTORIES,
    IGNORED_FILES,
    ALLOWED_EXTENSIONS
}