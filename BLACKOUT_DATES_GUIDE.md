# Blackout Dates System - User Guide

## Overview

The blackout dates system helps you manage holidays, breaks, and other dates when classes won't meet. Parents can see upcoming class schedules, and you won't accidentally take attendance or bill for cancelled classes.

---

## Step 1: Create the Database Table

**Run the SQL migration in Supabase:**

1. Go to: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql
2. Open the file: `BLACKOUT_DATES_SETUP.sql`
3. Copy all the SQL code
4. Paste it into the Supabase SQL Editor
5. Click **"Run"**

This creates:
- `blackout_dates` table
- RLS policies (parents can read, admins can write)
- Indexes for fast queries

---

## Step 2: Deploy Updated Files

Push your changes to GitHub:

```bash
git push origin main
```

This deploys:
- Updated admin.html (new Blackout Dates tab)
- Updated portal.html (upcoming dates display)

---

## How to Use

### **Adding Blackout Dates (Admin)**

1. Go to **Admin → Blackout Dates tab**
2. Fill in the form:
   - **Date**: Select the date classes won't meet
   - **Reason**: e.g., "Thanksgiving Break", "Christmas Holiday"
3. Click **"Add Date"**

**Examples:**
- Date: Dec 25, 2025 → Reason: "Christmas Day"
- Date: Nov 28, 2025 → Reason: "Thanksgiving Break"
- Date: Jan 1, 2026 → Reason: "New Year's Day"

---

### **Viewing Blackout Dates (Admin)**

The Blackout Dates tab shows two sections:

**Upcoming Blackout Dates:**
- Dates that haven't happened yet
- Shown in white with red delete button
- These are what parents will see

**Past Blackout Dates:**
- Grayed out historical records
- Kept for record-keeping
- Can still be deleted if added by mistake

---

### **Effect on Attendance Tab**

When you navigate weeks in the Attendance tab:

**Normal Classes:**
- Green/yellow badges ("Not Taken" or "X/Y Present")
- Clickable to take roll
- Normal appearance

**Blackout Dates:**
- Red badge saying "No Class"
- Grayed out (opacity 60%)
- **Not clickable** - can't take attendance
- Shows the reason you entered

---

### **Parent Portal View**

Parents see upcoming classes in **Class Information tab**:

**"Upcoming Class Dates" Section:**
- Shows next 4 weeks of Saturdays and Mondays
- Each date shows:
  - Day of week and date
  - Class times OR blackout reason
  - Color-coded badges

**Green Badge "✓ Class Meets":**
- Normal class day
- Shows class times (9:30-10:30am, etc.)

**Red Badge "❌ No Class":**
- Blackout date
- Shows your reason
- Red background color

---

## Common Use Cases

### **Holiday Breaks**

Add individual days:
- Dec 25: "Christmas Day"
- Dec 26: "Day after Christmas"
- Jan 1: "New Year's Day"

OR add a range by entering each date:
- Dec 23: "Winter Break"
- Dec 30: "Winter Break"

### **Weather Cancellations**

Add dates as needed:
- Jan 15: "Snow Day"
- Feb 5: "Ice Storm"

### **Personal Days**

- March 10: "Instructor Travel"
- April 20: "Professional Development"

---

## Tips & Best Practices

### **Planning Ahead**

✅ **Add blackout dates as soon as you know about them**
- Parents can plan around your schedule
- Prevents confusion about "no class" days

### **Clear Reasons**

✅ **Use descriptive reasons:**
- Good: "Thanksgiving Break"
- Bad: "Off"

✅ **Be consistent:**
- "Spring Break" (not "No class spring")
- "Christmas Holiday" (not "Xmas")

### **Review Regularly**

- Check upcoming dates each month
- Add holidays 4-8 weeks in advance
- Delete dates added by mistake immediately

### **Communicate Changes**

After adding blackout dates:
1. Parents will see them automatically in portal
2. Consider sending an email for major changes
3. Mention at end of class

---

## Deleting Blackout Dates

If you added a date by mistake or need to reschedule:

1. Go to **Admin → Blackout Dates**
2. Find the date in the list
3. Click **"Delete"** button
4. Confirm the deletion

**What happens:**
- Date removed from database
- Attendance calendar updates immediately
- Parents will see class is scheduled again
- You can now take attendance for that date

---

## Technical Details

### **Database Schema**

```sql
blackout_dates:
- id (UUID)
- date (DATE) - unique, can't add same date twice
- reason (TEXT) - why classes aren't meeting
- created_at (TIMESTAMP)
- created_by (TEXT) - admin email who added it
```

### **How It Works**

**Admin Side:**
1. You add a date + reason
2. Stored in `blackout_dates` table
3. Attendance tab checks this table
4. Grays out matching dates

**Parent Side:**
1. Portal generates next 4 weeks of class dates
2. Checks each date against `blackout_dates`
3. Shows green (normal) or red (blackout)
4. Updates automatically when you add/delete dates

---

## Troubleshooting

### **Can't add a date - says it's already added**

- The date already exists in the database
- Check the list below the form
- Delete the existing entry if needed
- Then add it again with new reason

### **Parents not seeing blackout dates**

1. Verify date was added successfully in admin
2. Ask parent to refresh their portal
3. Check they're viewing "Class Information" tab
4. Verify date is within next 4 weeks

### **Attendance calendar not showing blackout**

1. Refresh the admin page
2. Switch to different tab and back
3. Check the date in Blackout Dates tab
4. Verify SQL migration ran successfully

### **Need to cancel ALL classes for a week**

Add both days separately:
1. Saturday of that week
2. Monday of that week

Each needs its own entry (can use same reason).

---

## SQL Queries (For Reference)

### **View all blackout dates:**
```sql
SELECT * FROM blackout_dates ORDER BY date;
```

### **Find upcoming blackout dates:**
```sql
SELECT * FROM blackout_dates
WHERE date >= CURRENT_DATE
ORDER BY date;
```

### **Delete old blackout dates:**
```sql
DELETE FROM blackout_dates
WHERE date < CURRENT_DATE - INTERVAL '90 days';
```

---

## Integration with Attendance & Billing

### **Attendance:**
- Can't take roll for blackout dates
- Prevents accidental attendance records
- Keeps your data clean

### **Billing:**
- Billing tab shows classes where attendance was taken
- If no attendance (because it's a blackout), no one to bill
- Prevents accidentally charging for cancelled classes

### **Workflow:**
1. Add blackout dates in advance
2. Take attendance only on class days
3. Bill based on attendance records
4. Blackout dates automatically excluded

---

## Future Enhancements (Ideas)

### **Recurring Blackouts**
- "Every Monday in December"
- "All Saturdays in July"
- "Spring Break (5 consecutive days)"

### **Email Notifications**
- Auto-email parents when blackout added
- Weekly schedule reminders
- "Class tomorrow" notifications

### **Makeup Classes**
- Track missed classes
- Schedule makeup sessions
- Credit system

---

## Quick Reference

**Add Blackout Date:**
Admin → Blackout Dates → Enter date + reason → Add Date

**View Parent Perspective:**
Portal → Class Information → Upcoming Class Dates

**Remove Blackout:**
Admin → Blackout Dates → Find date → Delete

**Check Attendance Impact:**
Admin → Attendance → Navigate to week → See grayed out dates

---

**System is ready to use!** 🎉

Add your first blackout date (try Thanksgiving or Christmas) and see it appear in both admin and parent portal!
