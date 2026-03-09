---
name: pdf-processing
description: Read, extract, create, merge, split, and manipulate PDF files. Use this skill when the user asks to extract text or tables from a PDF, merge or split PDF documents, create a new PDF, rotate pages, add watermarks, password-protect a file, fill PDF forms, run OCR on scanned PDFs, or perform any programmatic processing of PDF files.
license: Proprietary. LICENSE.txt has complete terms.
---

This skill covers all PDF manipulation operations using Python libraries and command-line tools. Always choose the right tool for the task using the decision table below before writing any code.

---

## Tool Selection Guide

| Task | Best Tool |
|------|-----------|
| Extract text | `pdfplumber` |
| Extract tables | `pdfplumber` |
| Merge PDFs | `pypdf` or `qpdf` |
| Split PDFs | `pypdf` or `qpdf` |
| Rotate pages | `pypdf` or `qpdf` |
| Create new PDFs | `reportlab` |
| Add watermark | `pypdf` |
| Password protect | `pypdf` |
| Fill PDF forms | `pypdf` (see Form Filling section) |
| OCR scanned PDFs | `pytesseract` + `pdf2image` |
| Command-line ops | `qpdf` or `pdftk` |

### Install dependencies as needed:
```bash
pip install pypdf pdfplumber reportlab --break-system-packages
pip install pytesseract pdf2image --break-system-packages  # for OCR only
```

---

## 1. Read & Extract Text

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    print(f"Pages: {len(pdf.pages)}")
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

For basic metadata only:
```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}, Author: {meta.author}")
```

---

## 2. Extract Tables

```python
import pdfplumber
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

if all_tables:
    combined_df = pd.concat(all_tables, ignore_index=True)
    combined_df.to_excel("extracted_tables.xlsx", index=False)
```

---

## 3. Merge PDFs

```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

Command-line alternative:
```bash
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf
```

---

## 4. Split PDF

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

Split a page range via command line:
```bash
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
```

---

## 5. Create a New PDF

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("Report Title", styles['Title']))
story.append(Spacer(1, 12))
story.append(Paragraph("Body content goes here.", styles['Normal']))
story.append(PageBreak())
story.append(Paragraph("Page 2 heading", styles['Heading1']))
story.append(Paragraph("Page 2 content.", styles['Normal']))

doc.build(story)
```

For simple single-page PDFs:
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("simple.pdf", pagesize=letter)
width, height = letter
c.drawString(100, height - 100, "Hello World!")
c.save()
```

---

## 6. Rotate Pages

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

page = reader.pages[0]
page.rotate(90)  # 90, 180, or 270 degrees clockwise
writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

---

## 7. Add Watermark

```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

---

## 8. Password Protection

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt("userpassword", "ownerpassword")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

Remove a password (command line):
```bash
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

---

## 9. OCR — Scanned PDFs

Use when `pdfplumber` returns empty or garbled text (image-based PDFs).

```python
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path('scanned.pdf')

text = ""
for i, image in enumerate(images):
    text += f"--- Page {i+1} ---\n"
    text += pytesseract.image_to_string(image)
    text += "\n\n"

print(text)
```

> Requires `tesseract` installed on the system:
> ```bash
> sudo apt-get install tesseract-ocr poppler-utils
> ```

---

## 10. Fill PDF Forms

For form filling, follow this process:

1. Inspect the form fields first:
```python
from pypdf import PdfReader

reader = PdfReader("form.pdf")
fields = reader.get_fields()
for field_name, field in fields.items():
    print(f"Field: {field_name} | Type: {field.field_type} | Value: {field.value}")
```

2. Fill the fields:
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("form.pdf")
writer = PdfWriter()
writer.append(reader)

writer.update_page_form_field_values(
    writer.pages[0],
    {
        "field_name_1": "value 1",
        "field_name_2": "value 2",
    }
)

with open("filled_form.pdf", "wb") as output:
    writer.write(output)
```

> If fields are not detected or the form uses non-standard encoding, use `pdf-lib` (JavaScript) instead — it has better cross-compatibility for complex forms.

---

## Decision Checklist

Before writing any code, confirm:

- [ ] Is the PDF scanned/image-based? → Use OCR (`pytesseract`)
- [ ] Need to extract structured tables? → Use `pdfplumber`
- [ ] Need to create a PDF from scratch? → Use `reportlab`
- [ ] Need to fill a form? → Inspect fields first, then fill with `pypdf`
- [ ] Simple merge/split/rotate? → Use `pypdf` or `qpdf`
- [ ] Password operations? → Use `pypdf` (encrypt) or `qpdf` (decrypt)

---

## Output Rules

- Always save output files to `/mnt/user-data/outputs/`
- Use descriptive filenames: `merged.pdf`, `extracted_tables.xlsx`, `filled_form.pdf`
- After creating any file, call `present_files` so the user can download it
- If text extraction returns empty, automatically retry with OCR before reporting failure
