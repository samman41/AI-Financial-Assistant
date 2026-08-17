import io
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import extract
import pandas as pd

# ReportLab Imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.db import models
from app.services.ai_service import get_financial_summary_context

def get_report_transactions(db: Session, user_id: int, month: int, year: int) -> list:
    """Helper to fetch transactions for a specific month and year."""
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        extract("month", models.Transaction.date) == month,
        extract("year", models.Transaction.date) == year
    ).order_by(models.Transaction.date.desc()).all()

def generate_pdf_report(db: Session, user_id: int, month: int, year: int) -> bytes:
    """Generates a professional PDF Monthly Financial Report."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    company_name = user.company_name or "Your Business"
    currency = user.currency or "USD"
    
    # Fetch transactions for current month
    txs = get_report_transactions(db, user_id, month, year)
    
    # Financial context summary stats
    context = get_financial_summary_context(db, user_id)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#2563EB'), # Blue
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#4B5563'), # Gray
        alignment=TA_CENTER
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=15,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )

    bold_body_style = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    right_body_style = ParagraphStyle(
        'BodyDarkRight',
        parent=body_style,
        alignment=TA_RIGHT
    )

    header_cell_style = ParagraphStyle(
        'HeaderCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.white
    )

    story = []
    
    # --- Title Page / Header ---
    month_name = datetime.date(year, month, 1).strftime("%B %Y")
    story.append(Paragraph(f"{company_name} - Financial Report", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Reporting Period: {month_name} | Generated on {datetime.date.today().strftime('%Y-%m-%d')}", subtitle_style))
    story.append(Spacer(1, 20))
    
    # --- Executive Summary Card ---
    story.append(Paragraph("Executive Summary", h2_style))
    
    # Calculate revenue / expense for this specific month
    m_revenue = sum(t.amount for t in txs if t.type == "income")
    m_expense = sum(t.amount for t in txs if t.type == "expense")
    m_net = m_revenue - m_expense
    
    summary_data = [
        [
            Paragraph("Total Monthly Revenue", bold_body_style),
            Paragraph(f"{currency} {round(m_revenue, 2):,}", right_body_style)
        ],
        [
            Paragraph("Total Monthly Expenses", bold_body_style),
            Paragraph(f"{currency} {round(m_expense, 2):,}", right_body_style)
        ],
        [
            Paragraph("Net Profit / Loss", bold_body_style),
            Paragraph(f"{currency} {round(m_net, 2):,}", right_body_style)
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[250, 250])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,2), (1,2), colors.HexColor('#ECFDF5') if m_net >= 0 else colors.HexColor('#FEF2F2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # --- Category Breakdown ---
    story.append(Paragraph("Expense Category Breakdown", h2_style))
    
    # Calculate category stats for this month
    cat_dict = {}
    for t in txs:
        if t.type == "expense":
            cat_dict[t.category] = cat_dict.get(t.category, 0.0) + t.amount
            
    cat_data = [[Paragraph("Category", header_cell_style), Paragraph("Amount Spent", header_cell_style), Paragraph("Share", header_cell_style)]]
    
    if cat_dict:
        # Sort categories by size
        sorted_cats = sorted(cat_dict.items(), key=lambda x: x[1], reverse=True)
        for cat, amt in sorted_cats:
            share = (amt / m_expense * 100) if m_expense > 0 else 0
            cat_data.append([
                Paragraph(cat, body_style),
                Paragraph(f"{currency} {round(amt, 2):,}", right_body_style),
                Paragraph(f"{round(share, 1)}%", right_body_style)
            ])
    else:
        cat_data.append([Paragraph("No expenses recorded", body_style), Paragraph("-", right_body_style), Paragraph("-", right_body_style)])
        
    cat_table = Table(cat_data, colWidths=[200, 150, 150])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563EB')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(cat_table)
    story.append(Spacer(1, 15))
    
    # --- Anomalies and Insights ---
    story.append(Paragraph("AI Business Insights & Anomalies", h2_style))
    
    anoms_this_month = [t for t in txs if t.is_anomaly]
    if anoms_this_month:
        story.append(Paragraph("<b>⚠️ Unusual Transactions Detected:</b>", bold_body_style))
        for an in anoms_this_month:
            story.append(Paragraph(f"• <b>{an.name}</b> at {an.vendor}: {currency} {round(an.amount, 2)} - <i>{an.anomaly_reason}</i>", body_style))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 5))
    else:
        story.append(Paragraph("✔ No unusual spending or anomalies were flagged this month.", body_style))
        story.append(Spacer(1, 5))
        
    # Add general savings advice
    story.append(Paragraph("<b>💡 AI Financial Recommendation:</b>", bold_body_style))
    if m_expense > m_revenue:
        story.append(Paragraph("Discretionary spending is outpacing inbound revenues for this month, creating negative cash margins. We advise reviewing recurring SaaS accounts or renegotiating professional consulting terms to preserve capital.", body_style))
    else:
        story.append(Paragraph("Your cash flow is positive. Consider allocating 10% of profit into an emergency buffer or pre-paying annual subscriptions to capture cash discounts.", body_style))
        
    story.append(Spacer(1, 15))
    
    # --- Recent Transactions Table ---
    story.append(PageBreak()) # Shift long transactions list to page 2
    story.append(Paragraph("Transactions Ledger", h2_style))
    
    tx_data = [[
        Paragraph("Date", header_cell_style),
        Paragraph("Name/Vendor", header_cell_style),
        Paragraph("Category", header_cell_style),
        Paragraph("Type", header_cell_style),
        Paragraph("Amount", header_cell_style)
    ]]
    
    for t in txs[:30]: # Limit to top 30 in PDF to maintain reasonable page lengths
        tx_data.append([
            Paragraph(t.date.strftime('%Y-%m-%d'), body_style),
            Paragraph(f"<b>{t.name}</b><br/><font color='#64748B'>{t.vendor}</font>", body_style),
            Paragraph(t.category, body_style),
            Paragraph(t.type.capitalize(), bold_body_style if t.type == "income" else body_style),
            Paragraph(f"{currency} {round(t.amount, 2):,}", right_body_style)
        ])
        
    if len(txs) == 0:
        tx_data.append([Paragraph("No transactions found", body_style), Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style)])
        
    tx_table = Table(tx_data, colWidths=[70, 150, 110, 70, 100])
    tx_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(tx_table)
    
    if len(txs) > 30:
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<i>* Showing top 30 of {len(txs)} transactions. Generate an Excel report to view the full ledger.</i>", subtitle_style))
        
    # Build Document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

def generate_excel_report(db: Session, user_id: int, month: int, year: int) -> bytes:
    """Generates a professional Excel Workbook with financial summary and transactions ledger."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    currency = user.currency or "USD"
    txs = get_report_transactions(db, user_id, month, year)
    
    # 1. Sheets structure
    # Sheet 1: Summary Stats
    # Sheet 2: Category Breakdown
    # Sheet 3: Full Transactions Ledger
    
    # Build Transactions Data
    txs_data = []
    for t in txs:
        txs_data.append({
            "ID": t.id,
            "Date": t.date.strftime('%Y-%m-%d'),
            "Name": t.name,
            "Vendor": t.vendor,
            "Category": t.category,
            "Type": t.type.upper(),
            "Amount": t.amount,
            "Payment Method": t.payment_method,
            "Is Anomaly": "YES" if t.is_anomaly else "NO",
            "Anomaly Reason": t.anomaly_reason or "",
            "Description": t.description or "",
            "Notes": t.notes or ""
        })
    df_txs = pd.DataFrame(txs_data)
    
    # Build Summary Data
    m_revenue = sum(t.amount for t in txs if t.type == "income")
    m_expense = sum(t.amount for t in txs if t.type == "expense")
    m_net = m_revenue - m_expense
    
    summary_data = {
        "Financial KPI": ["Total Revenue", "Total Expenses", "Net Profit / Loss"],
        f"Amount ({currency})": [m_revenue, m_expense, m_net]
    }
    df_summary = pd.DataFrame(summary_data)
    
    # Build Category Breakdown Data
    cat_dict = {}
    for t in txs:
        if t.type == "expense":
            cat_dict[t.category] = cat_dict.get(t.category, 0.0) + t.amount
            
    cat_data = []
    for cat, amt in cat_dict.items():
        share = (amt / m_expense) if m_expense > 0 else 0
        cat_data.append({
            "Category": cat,
            f"Amount Spent ({currency})": amt,
            "Share Percentage": share
        })
    
    # If empty
    if not cat_data:
        cat_data.append({"Category": "No expenses recorded", f"Amount Spent ({currency})": 0.0, "Share Percentage": 0.0})
        
    df_cats = pd.DataFrame(cat_data).sort_values(by=f"Amount Spent ({currency})", ascending=False)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name="Summary Overview", index=False)
        df_cats.to_excel(writer, sheet_name="Category Spending", index=False)
        df_txs.to_excel(writer, sheet_name="All Transactions", index=False)
        
        # Style workbook columns dynamically
        workbook = writer.book
        
        # Styles for Summary sheet
        ws_sum = writer.sheets["Summary Overview"]
        ws_sum.column_dimensions['A'].width = 25
        ws_sum.column_dimensions['B'].width = 20
        # Format money
        for cell in ws_sum['B'][1:]:
            cell.number_format = '"$"#,##0.00'
            
        # Styles for Category sheet
        ws_cat = writer.sheets["Category Spending"]
        ws_cat.column_dimensions['A'].width = 30
        ws_cat.column_dimensions['B'].width = 25
        ws_cat.column_dimensions['C'].width = 20
        for cell in ws_cat['B'][1:]:
            cell.number_format = '"$"#,##0.00'
        for cell in ws_cat['C'][1:]:
            cell.number_format = '0.0%'
            
        # Styles for Ledger sheet
        if not df_txs.empty:
            ws_ledger = writer.sheets["All Transactions"]
            col_widths = {
                'A': 8, 'B': 13, 'C': 25, 'D': 20, 'E': 25,
                'F': 10, 'G': 15, 'H': 18, 'I': 12, 'J': 30,
                'K': 30, 'L': 25
            }
            for col, width in col_widths.items():
                ws_ledger.column_dimensions[col].width = width
            for cell in ws_ledger['G'][1:]:
                cell.number_format = '"$"#,##0.00'
                
    excel_bytes = output.getvalue()
    output.close()
    return excel_bytes
