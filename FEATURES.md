# EduOrbit LMS - Feature Specification

## 📚 Overview
EduOrbit is a comprehensive mobile Learning Management System (LMS) designed to deliver a premium education experience while providing robust tools for business management. The application is divided into two distinct, optimized interfaces: **Student Learning App** and **Admin Business Suite**.

---

## 💎 Core Value Propositions

### 1. 💰 Monetization & Commerce
*   **Integrated Payment Gateway:** Seamless Razorpay integration for secure, one-tap payments.
*   **Coupon Engine:** Create percentage-based discount codes with expiry dates to drive sales.
*   **Access Control:** Automated course expiry (e.g., 180 days) to encourage renewals and subscriptions.
*   **Order Management:** Full invoice history and transaction tracking for students and admins.

### 2. 🛡️ Content Security & Rights Management
*   **Secure Streaming:** HLS (HTTP Live Streaming) prevents direct video file downloads.
*   **Encrypted Offline Mode:** Downloaded content is stored in a sandboxed, encrypted environment accessible ONLY via the app.
*   **Device Restriction:** (Planned) Limit concurrent logins to prevent account sharing.
*   **Screenshot Prevention:** (Configurable) secure flag to prevent screen recording on sensitive content.

### 3. 📈 Retention & Engagement
*   **Smart Resume:** "Continue Watching" bar on the dashboard jumps students right back into the action.
*   **Gamification:** Progress bars, completion badges, and automated PDF Certificates upon 100% completion.
*   **Push Notifications:** Real-time alerts for new courses, offers, and instructor replies (via Firebase).

---

## 📱 Detailed Feature List

### 🎓 Student Interface

#### **Onboarding & Auth**
*   **Interactive Onboarding:** 3-step slide introduction to app features.
*   **Secure Auth:** Streamlined Auth flow with subtle background animations. Modern toggle for Magic Link/Password login.
*   **Permission Handling:** Graceful requests for Storage (downloads) and Notification permissions.

#### **Discovery (Dashboard)**
*   **Hero Carousel:** Dynamic banners highlighting top courses or offers.
*   **Quick Actions:** One-tap access to "Resume Learning" or "My Certificates".
*   **Categories:** Visual browsing by subject/domain.
*   **Search & Filter:** Real-time search by title, instructor, or price range.

#### **Learning Experience**
*   **Course Details:** Rich media preview, curriculum breakdown, instructor bio, and reviews.
*   **Video Player:**
    *   **Adaptive Quality:** Auto-switches between 1080p/720p/360p based on internet speed.
    *   **Controls:** 10s seek, speed control (0.5x - 2.0x), fullscreen toggle.
    *   **Attachments:** View PDFs and resources directly within the lesson.
*   **Offline Downloads:**
    *   **Background Downloading:** Queue multiple videos.
    *   **Download Manager:** Pause, Resume, and Delete downloads.
    *   **Storage Management:** Visual indicator of used/free disk space.

#### **Student Dashboard**
*   **My Courses:** Grid view of enrolled courses with progress indicators.
*   **Enhanced Analytics:** Deep insights into learning progress and user engagement metrics directly within the student profile.
*   **Expiry Trackers:** "Expires in X days" countdowns.
*   **Profile Management:** Modernized profile screen with accurate info, storage, and support icons.
*   **Certificates:** Download high-quality PDF certificates.

### 💼 Admin Interface
*Featuring a "Fresh UI" aesthetic with subtle gradients, glassmorphism, and elevated shadows.*

#### **Business Dashboard**
*   **Revenue Analytics:** Daily/Weekly/Monthly sales charts.
*   **User Growth:** Active student count and new registration metrics.
*   **Top Performers:** Identify best-selling courses and top-rated instructors.

#### **Content Management (CMS)**
*   **Course Creator:**
    *   Set Pricing, Title, Description, and Thumbnail.
    *   Configure **Validity Period** (e.g., Lifetime vs. 1 Year).
*   **Curriculum Builder:**
    *   Create Sections/Chapters.
    *   **Mobile Video Upload:** Upload gigabytes of video content directly from the phone gallery to Bunny.net.
    *   **Attachment Upload:** Add PDF notes or resources.

#### **User & Sales Management**
*   **Student CRM:** View detailed student profiles, enrolled courses, and progress.
*   **Manual Access:** Grant or revoke course access manually (e.g., for offline payments).
*   **Access Extension:** Extend course validity for specific students.
*   **Coupon Manager:** Create, edit, and deactivate discount codes instantly.

#### **Communication**
*   **Support Chat:** Reply to student queries in real-time, featuring Open Graph link previews and polished chat bubbles.
*   **Real-time Notifications:** In-app slide-down notifications synced in real-time between admin actions and students.
*   **Broadcasts:** Send push notifications to all users (e.g., "Flash Sale starts now!").

---

## 🏗️ User Flows

### 1. The "Impulse Buy" Flow
`Dashboard -> Click Promo Banner -> Course Details -> Apply Coupon -> Pay via Razorpay -> Instant Access`

### 2. The "Commuter" Flow (Offline)
`Wifi Zone -> Download Chapter -> Commute (No Internet) -> Open App -> Downloads Tab -> Watch Video`

### 3. The "Content Creator" Flow
`Admin Mode -> Create Course -> Upload Video from Gallery -> Publish -> Send Notification`

---

## 🚀 Technical Capabilities
*   **Backend Proxy:** Custom Node.js/Next.js middleware to handle sensitive API keys.
*   **Database:** PostgreSQL (via Supabase) with 50+ tables and complex relations.
*   **Storage:** Enterprise-grade CDN (Bunny.net) for video, Cloudinary for images.
*   **State Sync:** Optimistic UI updates for a snappy feel even on slow networks.
