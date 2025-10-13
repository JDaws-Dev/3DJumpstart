# Attendance Tracking & Billing System - Setup Guide

## Overview

Your admin panel now has a complete attendance tracking and attendance-based billing system. This prevents you from charging students who didn't attend and keeps detailed records.

---

## Step 1: Create the Database Tables

**Run the SQL migration in Supabase:**

1. Go to: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql
2. Open the file: `ATTENDANCE_SETUP.sql`
3. Copy all the SQL code
4. Paste it into the Supabase SQL Editor
5. Click **"Run"**

This creates:
- `attendance` table (stores who attended each class)
- Indexes for fast queries
- RLS policies for security
- Adds `attendance_date` field to `payments` table

---

## Step 2: Deploy Updated Files

Your changes are committed to git. Push to GitHub:

```bash
git push origin main
```

GitHub Pages will automatically deploy the updated:
- admin.html (new Attendance tab)
- portal.html (removed edit button, fixed caliper text)
- payment-success.html (fixed bouncing issue)

---

## Step 3: How to Use the New System

### **Taking Attendance (Weekly)**

1. Go to **Admin → Attendance tab**
2. Use the week navigator (← Previous Week | Next Week →)
3. You'll see 4 class cards:
   - Saturday 9:30-10:30am (Grades 4-7)
   - Saturday 10:30-11:30am (Grades 8-12)
   - Monday 4:30-5:30pm (Grades 4-7)
   - Monday 5:30-6:30pm (Grades 8-12)
4. Click on a class card to open the roll call modal
5. Check the box for each student who attended
6. Click **"Save Attendance"**

**Tips:**
- Students are checked by default (assume present)
- Uncheck absent students
- You can edit attendance anytime by clicking the class again
- Badge shows "Not Taken" or "X/Y Present"

---

### **Billing Students (Weekly)**

1. Go to **Admin → Weekly Billing tab**
2. Use the week navigator to select the week
3. Select a class from the dropdown
4. You'll see:
   - Only students who were marked **present** in attendance
   - Students already charged are **grayed out** with "✓ Already Charged"
5. Check the students you want to charge
6. Click **"Charge X Students ($Y)"**
7. Confirm the charge

**What Happens:**
- Creates payment records with `attendance_date`
- Prevents double-billing (already charged students are disabled)
- Links payment to specific class date

---

## Step 4: Weekly Workflow

**Your New Weekly Routine:**

### After Each Class:
1. **Take Roll** (Attendance tab)
   - Open the class for that date
   - Mark who attended
   - Save

### End of Week:
2. **Bill Parents** (Weekly Billing tab)
   - Select the week
   - For each class, select students
   - Charge them ($40 per student)

### Monitor:
3. **Check Payment History** (Payment History tab)
   - See all charges
   - Filter by "Weekly" type
   - View attendance dates

---

## Key Features

✅ **Attendance Tracking**
- Weekly calendar view
- Mark present/absent per class date
- Historical records

✅ **Attendance-Based Billing**
- Only charge students who attended
- Prevents double-billing
- Shows who's already been charged

✅ **Records**
- Full attendance history
- Payments linked to attendance dates
- Easy dispute resolution

✅ **Prevents Issues**
- Can't charge absent students
- Can't charge same student twice for same date
- Clear audit trail

---

## Database Schema

### `attendance` table:
```sql
- id (UUID)
- enrollment_id (UUID) → links to enrollments
- student_id (UUID) → links to students
- class_period_id (TEXT) → 'sat_930am', 'sat_1030am', etc.
- class_date (DATE) → '2025-01-15'
- present (BOOLEAN) → true/false
- notes (TEXT) → optional notes
- created_at, updated_at
- UNIQUE constraint on (enrollment_id, class_date)
```

### `payments` table updates:
```sql
- attendance_date (DATE) → links payment to specific class date
- attendance_ids (UUID[]) → array of attendance record IDs
```

---

## Troubleshooting

### "No attendance recorded yet" message?
- Go to Attendance tab first
- Take roll for that class date
- Then go back to Billing tab

### Student not showing in billing?
- Check if they were marked **present** in attendance
- Only present students appear in billing

### Can't charge a student?
- Check if they're grayed out with "✓ Already Charged"
- You can't charge the same student twice for same date

### Need to refund?
- Delete the payment record from Payment History
- Student will become chargeable again

---

## Email Confirmations

Email confirmations are now sent via Resend when payments complete through Stripe.

**Email includes:**
- "Enrollment Confirmed!" header
- Student names and class times
- Amazon link for Dial Calipers
- Location will be sent before first class

**Already configured:**
- ✅ Resend API key in Supabase secrets
- ✅ FROM_EMAIL: noreply@3djumpstart.com
- ✅ Webhook deployed with email functionality

---

## Next Steps (Optional Enhancements)

### Future Improvements:
1. **Stripe Integration for Weekly Billing**
   - Currently using manual payment records
   - Could integrate Stripe API to charge cards automatically

2. **Parent Portal Attendance View**
   - Show parents their child's attendance history
   - Let them see which classes were attended

3. **Attendance Reports**
   - Export attendance to CSV
   - Monthly attendance summaries
   - Identify students with low attendance

4. **Makeup Class Credits**
   - Track missed classes
   - Offer makeup class scheduling

---

## Support

If you have questions or need help:
1. Check this guide first
2. Review the database schema in `ATTENDANCE_SETUP.sql`
3. Check browser console for errors
4. Verify SQL migration ran successfully in Supabase

---

**System is now fully operational!** 🎉

Take roll → Bill based on attendance → Keep records → No more manual tracking!
