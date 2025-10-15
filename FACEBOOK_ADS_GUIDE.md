# Facebook Ads Strategy for 3D Jumpstart
## Targeting Suwanee, GA Moms

---

## 🎯 Campaign Overview

**Goal:** Get parents to enroll their kids in 3D design classes
**Target:** Moms with kids ages 9-17 in Suwanee/North Gwinnett area
**Budget:** Start with $10-20/day to test
**Timeline:** 2-week campaign before Oct 25 class start

---

## Step-by-Step Setup Process

### Step 1: Create Facebook Business Manager Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Add your business info:
   - Business name: 3D Jumpstart
   - Your name: Jeremiah Daws
   - Business email: jeremiah@3djumpstart.com
4. Add your Facebook Page (or create one if you don't have it)
5. Add payment method (credit card)

---

### Step 2: Install Facebook Pixel on Your Website

**What it does:** Tracks visitors so you can retarget them later

**How to install:**
1. In Business Manager → Events Manager → Click "Connect Data Sources"
2. Select "Web" → Click "Facebook Pixel" → Click "Connect"
3. Name it "3D Jumpstart Pixel"
4. Choose "Install code manually"
5. Copy the pixel code

**Add this code to EVERY page** (right before `</head>` tag):

```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID_HERE');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
```

**Add conversion tracking to payment-success.html:**

```html
<script>
fbq('track', 'Purchase', {
  value: 40.00,
  currency: 'USD'
});
</script>
```

---

### Step 3: Create Your First Ad Campaign

#### Campaign Settings

1. Go to Ads Manager → Click "Create"
2. **Choose objective:** "Sales" or "Traffic" (start with Traffic)
3. **Campaign name:** "3D Jumpstart - Suwanee Enrollment - Oct 2025"
4. **Campaign budget:** $20/day (can adjust after testing)
5. **Advantage campaign budget:** Turn OFF (you want manual control)

#### Ad Set Settings (Targeting)

**Ad Set Name:** "Suwanee Moms - Ages 35-50"

**Budget & Schedule:**
- Daily budget: $20/day
- Start: Today
- End: Oct 23, 2025 (2 days before class starts)

**Audience (This is the most important part!):**

**Location:**
- Target: "Suwanee, GA"
- Radius: 15 miles (covers surrounding areas)
- OR specific cities: Suwanee, Johns Creek, Duluth, Buford, Sugar Hill

**Age:** 35-50 years old

**Gender:** Women (moms are primary decision makers for kids' activities)

**Detailed Targeting (Choose 2-3):**
- **Parents:**
  - Parents with teenagers (13-17)
  - Parents with preteens (8-12)
  - Parents with children ages 8-12
  - Parents with children ages 13-17

- **Interests - Education:**
  - STEM education
  - Coding
  - Robotics
  - Engineering
  - Khan Academy
  - Outschool

- **Interests - Enrichment:**
  - Extracurricular activity
  - After-school activity
  - Summer camp

- **Local Community:**
  - North Gwinnett High School
  - Peachtree Ridge High School
  - Lambert High School
  - (These will auto-target parents in that district)

- **Tech-Savvy Parents:**
  - 3D printing
  - Maker culture
  - Technology
  - Online learning

**Advanced Options:**
- **Exclude:** People who already like your page (optional - save money by not showing ads to existing fans)
- **Custom Audience:** Create "Website Visitors" audience (people who visited your site but didn't enroll)

**Languages:** English (all)

**Placements:**
- Choose "Manual Placements"
- **Select ONLY:**
  - Facebook Feed (News Feed)
  - Instagram Feed
  - Facebook Marketplace
  - Instagram Explore

- **Uncheck these (they perform poorly):**
  - Facebook Right Column
  - Instagram Stories (unless you have vertical video)
  - Messenger
  - Audience Network

**Optimization & Delivery:**
- Optimization for ad delivery: "Link clicks"
- Conversion location: Website
- Cost control: Automatic (let Facebook optimize)

---

### Step 4: Create Your Ad Creative

**Ad Name:** "Disney Animator - Free Trial"

#### Ad Format Options

**Option A: Single Image Ad (Easiest)**

**Primary Text (First 125 characters matter most):**

```
🎨 Does your child spend hours gaming or on screens?

Teach them to CREATE instead of just consume.

Former Disney/Marvel animator teaching kids (grades 4-12) professional 3D design in Suwanee.

✅ Week-to-week, no contracts
✅ Small classes (max 10 students)
✅ Real software used by SpaceX, Tesla, Disney
✅ First class FREE - try it risk-free

Saturday mornings & Monday evenings available.

Only 3 spots left in some classes. Reserve your child's spot before Oct 25. 👇
```

**Headline (40 characters max):**
- "Turn Screen Time Into Skill Time"
- "Learn 3D Design from Disney Animator"
- "Professional 3D Design for Kids"

**Description (under headline, optional):**
- "$40/week • No contracts • North Suwanee"
- "First class FREE • Grades 4-12 • Suwanee"

**Call-to-Action Button:**
- "Learn More" (best for cold traffic)
- Or "Sign Up" (if you're confident)

**Image:**
- Photo of YOU with kids in class (builds trust)
- Or student working on design (shows experience)
- Or student holding printed 3D object (shows tangible result)
- Text overlay: "Learn from Disney Animator | Suwanee, GA"

**Image specs:**
- Size: 1200x628 pixels (landscape)
- Text on image: Keep under 20% of image (Facebook restricts text-heavy images)

---

**Option B: Video Ad (Higher Engagement)**

**Video specs:**
- Length: 15-30 seconds (keep it SHORT)
- Format: Square (1:1 ratio, 1080x1080) or vertical (9:16, 1080x1920)
- MUST have captions (90% watch without sound)

**Video script (30 seconds):**

```
[0-3s] Hook: "Does your kid spend 3+ hours gaming?"

[4-8s] Problem: "Turn that screen time into a real skill."

[9-15s] Solution: "I'm Jeremiah, former Disney animator. I teach kids professional 3D design—the same software used by SpaceX and Tesla."

[16-22s] Proof: "Here's what students create in 8 weeks [show student work]"

[23-27s] CTA: "First class FREE. Suwanee. Saturday mornings or Monday evenings."

[28-30s] Urgency: "Only 3 spots left. Link below."
```

**Video overlay text:**
- "Disney Animator Teaching Kids 3D Design"
- "Suwanee, GA • Grades 4-12"
- "First Class FREE 🎁"

---

**Option C: Carousel Ad (Multiple Images)**

**Why use:** Show different student projects or benefits

**Carousel cards (5 images):**
1. **Card 1:** Your photo + "Former Disney Animator | Teaching Kids 3D Design"
2. **Card 2:** Student work example 1 + "What Your Child Will Create"
3. **Card 3:** Student work example 2 + "From Beginner to Designer in 8 Weeks"
4. **Card 4:** Class photo + "$40/week • No Contracts • Small Classes"
5. **Card 5:** CTA + "First Class FREE • Reserve Spot Today"

Each card links to: https://3djumpstart.com

---

### Step 5: Create Retargeting Campaigns (After 1 Week)

**Why:** 95% of people won't enroll the first time they see your ad. Retargeting reminds them.

**Custom Audience:** "Website Visitors - Last 7 Days"

1. Go to Audiences → Create Custom Audience
2. Choose "Website"
3. Choose "All website visitors"
4. Time: "Past 7 days"
5. Name: "3DJ Website Visitors - 7d"

**Retargeting ad text (shorter, more direct):**

```
Still thinking about 3D design classes?

🎁 First class is FREE - no commitment!

Saturday mornings or Monday evenings in Suwanee.

Your child could be designing real products in 2 months.

Only 3 spots left. Enroll before Oct 25. 👇
```

---

### Step 6: Create a Facebook Page (If You Don't Have One)

**Why:** Ads require a Facebook Page. Also builds social proof.

**Setup:**
1. Go to facebook.com/pages/create
2. Business name: 3D Jumpstart
3. Category: Education
4. Bio: "Professional 3D design classes for kids grades 4-12 in Suwanee, GA. Taught by former Disney animator. Learn Fusion360 CAD software used by Tesla, SpaceX, Apple."

**Profile photo:** Your logo or headshot

**Cover photo:**
- Photo of students working
- Text overlay: "Professional 3D Design Classes • Grades 4-12 • Suwanee, GA"

**Post content (2-3x per week):**
- Student work showcases
- Behind-the-scenes teaching
- "Meet the instructor" post (your Disney credentials)
- Parent testimonials
- Class schedule updates

**Add Button:** "Sign Up" → Link to 3djumpstart.com

---

## 📊 Ad Testing Strategy

### Test #1: Audience (Week 1)

**Run 3 ad sets with same creative, different audiences:**

**Ad Set A:** Broad parents
- Target: Parents with kids 8-17, Suwanee 15mi radius
- Budget: $10/day

**Ad Set B:** Education-focused parents
- Target: Parents + Interests: STEM education, Coding, Engineering
- Budget: $10/day

**Ad Set C:** High-income parents
- Target: Parents + Household income: Top 10%
- Budget: $10/day

**After 3 days, check results:**
- Which ad set has lowest Cost Per Click (CPC)?
- Which has highest Click-Through Rate (CTR)?
- Turn off worst performer, double budget on best

---

### Test #2: Creative (Week 2)

**Keep best-performing audience, test 3 different ads:**

**Ad A:** "Disney Animator" angle (credibility)
**Ad B:** "Turn Gaming Into Creating" angle (parent pain point)
**Ad C:** "First Class FREE" angle (low risk)

**After 3 days:**
- Keep best performer
- Turn off others

---

## 💰 Budget & Cost Expectations

**Expected Costs (Suwanee area):**
- Cost Per Click (CPC): $0.50 - $2.00
- Click-Through Rate (CTR): 1-3% (good = 2%+)
- Cost Per Website Visitor: $1 - $3
- Cost Per Lead/Enrollment: $20 - $50

**Sample Math:**
- Budget: $20/day for 14 days = $280 total
- Expected clicks: 140-280 clicks
- Expected website visits: 100-200
- Expected enrollments: 5-10 (if 5% convert)
- Revenue: 5 students × $40/week × 8 weeks = $1,600

**ROI:** Spend $280, earn $1,600 = 470% ROI

---

## 🎯 Advanced Targeting: Lookalike Audiences

**Once you have 5+ enrollments:**

1. Create Custom Audience: "Enrolled Parents" (upload email list)
2. Create Lookalike Audience based on enrolled parents
3. Target: "1% Lookalike - Enrolled Parents - Suwanee"
4. This finds people similar to your best customers

---

## 📱 Instagram Strategy (Piggyback on Facebook Ads)

**Why:** Facebook owns Instagram; you can run ads on both platforms with same campaign

**Instagram-specific tips:**
- Use square images (1080x1080) or vertical (1080x1920)
- Hashtags don't matter in ads (only organic posts)
- Instagram Explore performs well for discovery
- Stories work IF you have vertical video with captions

**Organic Instagram Content (Free Marketing):**
- Post student work: "Check out what Emma designed in Week 3!"
- Reels: 15-second time-lapse of design process
- Behind-the-scenes: You teaching, explaining concepts
- Use hashtags: #SuwaneeGA #STEMeducation #3Dprinting #GwinnettKids #NorthGwinnett

---

## 🚨 Common Mistakes to Avoid

❌ **Targeting too broad:** "All of Georgia" → Too expensive, not relevant
✅ **Do this:** Suwanee + 15 miles

❌ **Boosting posts:** Facebook's "Boost Post" button is lazy targeting
✅ **Do this:** Use Ads Manager for precise control

❌ **No retargeting:** 95% won't convert first visit
✅ **Do this:** Retarget website visitors with reminder ads

❌ **Text-heavy images:** Facebook throttles these
✅ **Do this:** Keep text under 20% of image

❌ **Running ads without pixel:** You can't track conversions
✅ **Do this:** Install pixel FIRST, then run ads

❌ **Not testing:** Running one ad forever
✅ **Do this:** Test audiences, test creative, double down on winners

❌ **Ignoring mobile:** 80% of Facebook is mobile
✅ **Do this:** Preview ads on mobile device

---

## 📋 Pre-Launch Checklist

Before spending money, verify:

- [ ] Facebook Business Manager account created
- [ ] Facebook Page created and filled out
- [ ] Payment method added
- [ ] Facebook Pixel installed on website
- [ ] Pixel firing correctly (test with Facebook Pixel Helper Chrome extension)
- [ ] Landing page loads fast on mobile
- [ ] "Enroll" button works
- [ ] You can reply to messages within 1 hour (parents will message you)
- [ ] Ad creative follows Facebook ad policies (no "before/after" claims, no "you" language in some contexts)

---

## 📈 What Success Looks Like

**Week 1 Metrics:**
- Impressions: 10,000-20,000
- Clicks: 100-200
- CTR: 1-2%
- CPC: $1-2
- Website visits: 80-150

**Week 2 Metrics (after optimization):**
- Impressions: 15,000-30,000
- Clicks: 150-300
- CTR: 2-3%
- CPC: $0.50-1.50
- Website visits: 120-250
- Enrollments: 5-10

**If after 7 days you have:**
- CTR < 1% → Your creative is weak (change headline/image)
- CPC > $3 → Your targeting is too competitive (narrow or change)
- 0 enrollments → Your landing page has issues (add trust signals, simplify CTA)

---

## 🎁 Bonus: Free Marketing Tactics

**While running ads, also do this (free):**

1. **Local Facebook Groups:**
   - "Suwanee Moms" group
   - "North Gwinnett Parents"
   - "Johns Creek Family Events"
   - Post: "Hi! I'm teaching 3D design classes for kids in Suwanee. Former Disney animator. First class free. Anyone interested?"

2. **Nextdoor App:**
   - Create business profile
   - Post in "Events" section
   - Sponsor local events

3. **Google My Business:**
   - Free listing
   - Shows up in "3D design classes near me" searches

4. **Partner with Local Schools:**
   - Email PTA presidents
   - Offer to do demo at school STEM night
   - Leave flyers in school offices (with permission)

5. **Referral Program:**
   - "Refer a friend, you both get 1 week free"
   - Parents will market for you

---

## 🔄 After Campaign: Retarget & Nurture

**For people who didn't enroll:**

**Retargeting ad #2 (1 week after first ad):**
```
Quick question: What's holding you back from enrolling?

Is it the schedule? Cost? Not sure if your kid would like it?

First class is FREE - come try it out! No risk.

Reply to this ad or message me your questions.

- Jeremiah
```

**Email sequence (if you collect emails):**
- Day 1: Welcome email with class details
- Day 3: "What students create" showcase
- Day 5: "Meet the instructor" (your Disney credentials)
- Day 7: "Last chance - only 3 spots left"

---

## Need Help?

**Resources:**
- Facebook Blueprint (free courses): facebook.com/business/learn
- Facebook Ads Library: See what competitors are running
- Hire help: Upwork/Fiverr ($200-500 for setup)

**Questions to Ask Yourself:**
- What makes my class different? (Disney credentials = unique)
- What's the parent's biggest pain point? (Screen time guilt)
- What's their biggest objection? (Cost, time commitment)
- How do I overcome it? (Free trial, no contracts)

---

**Bottom Line:**
- Start small ($20/day)
- Target tight (Suwanee moms, ages 35-50, parents of 8-17 year olds)
- Test everything (audience, creative, messaging)
- Retarget visitors who don't enroll
- Double down on what works

**First campaign goal:** Get 5-10 enrollments for Oct 25 class start. That's $200-400 in ad spend for $1,600+ revenue.
