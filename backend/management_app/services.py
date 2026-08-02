from datetime import date
from dateutil.relativedelta import relativedelta
from .models import Payment

def generate_payment_schedule(lease, months=12):
    """
    Auto-generates N months of Payment records for a Lease.
    """
    payments = []
    base_date = lease.start_date
    today = date.today()

    for i in range(months):
        due_date = base_date + relativedelta(months=i)
        
        # Determine status based on due_date vs today
        if due_date < today:
            status = 'paid'
            paid_date = due_date
        elif due_date == today:
            status = 'pending'
            paid_date = None
        else:
            status = 'pending'
            paid_date = None

        payment = Payment.objects.create(
            lease=lease,
            amount=lease.monthly_rent,
            due_date=due_date,
            paid_date=paid_date,
            status=status
        )
        payments.append(payment)

    return payments
