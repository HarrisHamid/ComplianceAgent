import io


def extract_text(file) -> dict:
    """
    Accepts a Flask FileStorage object, returns {'text': str, 'filename': str}.
    Supports PDF, DOCX, TXT, and MD.
    """
    filename = file.filename or 'unknown'
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    data = file.read()

    if ext == 'pdf':
        text = _from_pdf(data)
    elif ext == 'docx':
        text = _from_docx(data)
    elif ext in ('txt', 'md'):
        text = data.decode('utf-8', errors='replace')
    else:
        raise ValueError(f'Unsupported file type: .{ext}. Upload a PDF, DOCX, TXT, or MD file.')

    text = text.strip()
    if not text:
        raise ValueError('No readable text found in the document. Is it a scanned image PDF?')

    return {'text': text, 'filename': filename}


def _from_pdf(data: bytes) -> str:
    try:
        import pdfplumber
    except ImportError:
        raise ImportError('pdfplumber required: pip install pdfplumber')

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pages = [page.extract_text() or '' for page in pdf.pages]
    return '\n\n'.join(p for p in pages if p.strip())


def _from_docx(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise ImportError('python-docx required: pip install python-docx')

    doc = Document(io.BytesIO(data))
    return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
