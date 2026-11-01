from enum import Enum


class DownloadStatus(str, Enum):
    not_downloading = "not_downloading"
    downloading = "downloading"
    done = "done"
    error = "error"
    not_found = "not_found"


class TaskPhase(str, Enum):
    PENDING = "PHASE_TYPE_PENDING"
    RUNNING = "PHASE_TYPE_RUNNING"
    COMPLETE = "PHASE_TYPE_COMPLETE"
    ERROR = "PHASE_TYPE_ERROR"


class FileKind(str, Enum):
    FILE = "drive#file"
    FOLDER = "drive#folder"


class UrlType(str, Enum):
    DOWNLOAD = "download"
    PLAY = "play"
    ALL = "all"
