# Advanced Class Approval Workflow - Setup Instructions

## Overview
This implements an admin approval workflow for the Advanced (11am) Saturday class. Parents can request assessment, and you can approve/deny from the admin panel.

## Database Setup

You need to create the `advanced_class_requests` table in your Supabase database.

### Step 1: Create the Table

Go to your Supabase SQL Editor and run this:

```sql
-- Create advanced_class_requests table
CREATE TABLE IF NOT EXISTS public.advanced_class_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.advanced_class_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view their own requests
CREATE POLICY "Parents can view own requests"
  ON public.advanced_class_requests
  FOR SELECT
  USING (auth.uid() = parent_id);

-- Parents can create requests
CREATE POLICY "Parents can create requests"
  ON public.advanced_class_requests
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Admins can view all requests (jeremiah@3djumpstart.com)
CREATE POLICY "Admins can view all requests"
  ON public.advanced_class_requests
  FOR SELECT
  USING (
    auth.email() = 'jeremiah@3djumpstart.com'
  );

-- Admins can update requests
CREATE POLICY "Admins can update requests"
  ON public.advanced_class_requests
  FOR UPDATE
  USING (
    auth.email() = 'jeremiah@3djumpstart.com'
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_advanced_requests_parent
  ON public.advanced_class_requests(parent_id);

CREATE INDEX IF NOT EXISTS idx_advanced_requests_student
  ON public.advanced_class_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_advanced_requests_status
  ON public.advanced_class_requests(status);
```

### Step 2: Test the Setup

After running the SQL:

1. **Test as Parent:**
   - Log in to the parent portal
   - Enroll a student in a beginner class
   - You should see the "🎯 Ready for Advanced Training?" section
   - Click "Request Assessment" for a student
   - Verify the request is created

2. **Test as Admin:**
   - Log in to admin.html with jeremiah@3djumpstart.com
   - Click the "Advanced Requests" tab
   - You should see the pending request
   - Try approving it (add a note)
   - The parent should now see "✓ Approved - Ready to Enroll"

3. **Test Enrollment:**
   - As the parent, click "Enroll in Advanced →"
   - Student should be moved to the Saturday 11am Advanced class
   - Verify in admin panel that the enrollment updated

## How It Works

### Parent Flow:
1. Parent enrolls student in beginner class (9am or 10am)
2. "Request Advanced Class" section appears after enrollment
3. Parent clicks "Request Assessment"
4. Request is submitted with status='pending'
5. Parent sees "⏳ Request Pending"

### Admin Flow:
1. Admin logs into admin.html
2. Clicks "Advanced Requests" tab
3. Sees list of pending requests with student info
4. Clicks "Approve" and adds optional note
5. OR clicks "Deny" and must add explanation note

### Approval Flow:
1. Admin approves request
2. Parent portal updates to show "✓ Approved - Ready to Enroll"
3. "Enroll in Advanced →" button appears
4. Parent clicks button to move student to Advanced class
5. Student's enrollment is updated to `sat_11am` (11am Advanced)

### Denial Flow:
1. Admin denies request with explanation
2. Parent sees "✗ Not Ready Yet" with admin's note
3. Parent can see the feedback and work on skills

## Features

- **Public vs Private Classes:** The Advanced class (`sat_11am`) is marked as `public: false` so it doesn't appear in regular enrollment dropdowns
- **Request Tracking:** All requests are logged with timestamps
- **Admin Notes:** Both approvals and denials include notes for communication
- **Status Updates:** Real-time status updates when admin makes decisions
- **Email Integration Ready:** The system is ready for email notifications (you can add email triggers later)

## Files Modified

- `portal.html` - Added advanced class request section and enrollment logic
- `admin.html` - Added "Advanced Requests" tab with approve/deny interface

## Next Steps (Optional)

1. **Add Email Notifications:**
   - Send email when request is submitted (notify admin)
   - Send email when request is approved/denied (notify parent)
   - Use the existing `send-email.js` Netlify function

2. **Add Request History:**
   - Show past requests in parent portal
   - Allow re-requesting after improvements

3. **Require Payment Before Advanced:**
   - Add check that parent has active payment before enrolling in advanced

## Troubleshooting

**Issue:** Parents can't submit requests
- Check RLS policies are enabled
- Verify parent_id matches auth.uid()
- Check browser console for errors

**Issue:** Admin can't see requests
- Verify admin email matches 'jeremiah@3djumpstart.com' exactly
- Check admin RLS policy in Supabase

**Issue:** Enrollment doesn't update
- Verify `sat_11am` exists in CLASS_PERIODS
- Check that student has active enrollment
- Look for errors in browser console
