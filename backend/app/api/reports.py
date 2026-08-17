from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import datetime

from app.db.database import get_db
from app.db import models
from app.auth.auth import get_current_user
from app.reports.excel_pdf import generate_pdf_report, generate_excel_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/pdf")
def get_pdf_report(
    month: int = Query(default=datetime.date.today().month),
    year: int = Query(default=datetime.date.today().year),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downloads a structured PDF containing summary cards, category distributions, anomalies, and logs."""
    try:
        pdf_data = generate_pdf_report(db, current_user.id, month, year)
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=financial_report_{year}_{month}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}"
        )

@router.get("/excel")
def get_excel_report(
    month: int = Query(default=datetime.date.today().month),
    year: int = Query(default=datetime.date.today().year),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downloads a multi-sheet formatted Excel workbook with summary blocks and raw ledger files."""
    try:
        excel_data = generate_excel_report(db, current_user.id, month, year)
        return Response(
            content=excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=financial_report_{year}_{month}.xlsx"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Excel report: {str(e)}"
        )
