class CompilerError(Exception):
    """Base exception for all Timeline Compiler errors."""


class ParseError(CompilerError):
    """Raised when a canonical dataset cannot be parsed."""


class ValidationError(CompilerError):
    """Raised when validation encounters a blocking failure."""


class FileFormatError(CompilerError):
    """Raised when the input file has an unsupported format or extension."""
