/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditLog from './pages/AuditLog';
import FinancialDashboard from './pages/FinancialDashboard';
import AttendanceCall from './pages/AttendanceCall';
import CertDesigner from './pages/CertDesigner';
import CertificateAlerts from './pages/CertificateAlerts';
import Certificates from './pages/Certificates.jsx';
import BMMGenerator from './pages/BMMGenerator';
import BMMHistory from './pages/BMMHistory';
import BMMTemplates from './pages/BMMTemplates';
import ClassDetails from './pages/ClassDetails';
import CommunicationCenter from './pages/CommunicationCenter';
import Companies from './pages/Companies';
import Contractors from './pages/Contractors';
import CourseCategories from './pages/CourseCategories';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import EmailTemplates from './pages/EmailTemplates';
import Home from './pages/Home';
import Import from './pages/Import';
import InstructorDetails from './pages/InstructorDetails';
import InstructorFinancialControl from './pages/InstructorFinancialControl';
import InstructorPaymentReport from './pages/InstructorPaymentReport';
import Instructors from './pages/Instructors';
import NotificationSettings from './pages/NotificationSettings';
import PaymentAutomation from './pages/PaymentAutomation';
import ProfitabilityAnalysis from './pages/ProfitabilityAnalysis';
import RecyclingAlerts from './pages/RecyclingAlerts';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLog": AuditLog,
    "FinancialDashboard": FinancialDashboard,
    "AttendanceCall": AttendanceCall,
    "CertDesigner": CertDesigner,
    "CertificateAlerts": CertificateAlerts,
    "Certificates": Certificates,
    "BMMGenerator": BMMGenerator,
    "BMMHistory": BMMHistory,
    "BMMTemplates": BMMTemplates,
    "ClassDetails": ClassDetails,
    "CommunicationCenter": CommunicationCenter,
    "Companies": Companies,
    "Contractors": Contractors,
    "CourseCategories": CourseCategories,
    "Courses": Courses,
    "Dashboard": Dashboard,
    "EmailTemplates": EmailTemplates,
    "Home": Home,
    "Import": Import,
    "InstructorDetails": InstructorDetails,
    "InstructorFinancialControl": InstructorFinancialControl,
    "InstructorPaymentReport": InstructorPaymentReport,
    "Instructors": Instructors,
    "NotificationSettings": NotificationSettings,
    "PaymentAutomation": PaymentAutomation,
    "ProfitabilityAnalysis": ProfitabilityAnalysis,
    "RecyclingAlerts": RecyclingAlerts,
    "Reports": Reports,
    "Schedule": Schedule,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};