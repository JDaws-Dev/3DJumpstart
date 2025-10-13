# How to Clear Test Students from Database

## Method 1: Via Supabase Dashboard (Easiest)

Go to: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/editor

### Clear in this order:

**1. Delete Payments First**
- Click on `payments` table
- Select all rows (checkbox at top)
- Click "Delete" button
- Confirm

**2. Delete Enrollments**
- Click on `enrollments` table
- Select all rows
- Click "Delete"
- Confirm

**3. Delete Students**
- Click on `students` table
- Select all rows
- Click "Delete"
- Confirm

**4. Delete Parents (Optional)**
- Click on `parents` table
- Select all rows IF you want to delete parent accounts too
- Click "Delete"
- Confirm
- Note: This will delete the parent login accounts! Only do this if you want to start completely fresh.

## Method 2: SQL Script (Faster for bulk delete)

Go to: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql

Run this SQL:

```sql
-- Delete all test data
-- Run these one at a time in order

-- Delete payments first (no foreign key constraints)
DELETE FROM public.payments;

-- Delete enrollments (references students)
DELETE FROM public.enrollments;

-- Delete students (references parents)
DELETE FROM public.students;

-- Optional: Delete parents (this deletes login accounts!)
-- Only uncomment if you want to delete parent accounts too
-- DELETE FROM public.parents;

-- Verify everything is cleared
SELECT 'Payments:' as table_name, COUNT(*) as count FROM public.payments
UNION ALL
SELECT 'Enrollments:', COUNT(*) FROM public.enrollments
UNION ALL
SELECT 'Students:', COUNT(*) FROM public.students
UNION ALL
SELECT 'Parents:', COUNT(*) FROM public.parents;
```

## What Gets Deleted

- ✅ **Payments** - All test payment records
- ✅ **Enrollments** - All enrollments (cart and enrolled)
- ✅ **Students** - All student records
- ⚠️ **Parents** - Only delete if you want to remove login accounts

## After Clearing

You can now test fresh enrollments and the webhook will work properly!

## Keep Parent Accounts?

If you want to **keep parent login accounts** but just clear their students:
- Delete payments, enrollments, and students only
- Don't delete parents
- Parents can log in and enroll new students
