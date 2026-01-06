import AuditLog from './pages/AuditLog';
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
import Instructors from './pages/Instructors';
import ProfitabilityAnalysis from './pages/ProfitabilityAnalysis';
import RecyclingAlerts from './pages/RecyclingAlerts';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Users from './pages/Users';
import NotificationSettings from './pages/NotificationSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLog": AuditLog,
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
    "Instructors": Instructors,
    "ProfitabilityAnalysis": ProfitabilityAnalysis,
    "RecyclingAlerts": RecyclingAlerts,
    "Reports": Reports,
    "Schedule": Schedule,
    "Users": Users,
    "NotificationSettings": NotificationSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};