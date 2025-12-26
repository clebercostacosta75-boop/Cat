import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Schedule from './pages/Schedule';
import Courses from './pages/Courses';
import Reports from './pages/Reports';
import Instructors from './pages/Instructors';
import InstructorDetails from './pages/InstructorDetails';
import ClassDetails from './pages/ClassDetails';
import CourseCategories from './pages/CourseCategories';
import BMMTemplates from './pages/BMMTemplates';
import Companies from './pages/Companies';
import Contractors from './pages/Contractors';
import Users from './pages/Users';
import BMMGenerator from './pages/BMMGenerator';
import EmailTemplates from './pages/EmailTemplates';
import BMMHistory from './pages/BMMHistory';
import CommunicationCenter from './pages/CommunicationCenter';
import AuditLog from './pages/AuditLog';
import RecyclingAlerts from './pages/RecyclingAlerts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Import": Import,
    "Schedule": Schedule,
    "Courses": Courses,
    "Reports": Reports,
    "Instructors": Instructors,
    "InstructorDetails": InstructorDetails,
    "ClassDetails": ClassDetails,
    "CourseCategories": CourseCategories,
    "BMMTemplates": BMMTemplates,
    "Companies": Companies,
    "Contractors": Contractors,
    "Users": Users,
    "BMMGenerator": BMMGenerator,
    "EmailTemplates": EmailTemplates,
    "BMMHistory": BMMHistory,
    "CommunicationCenter": CommunicationCenter,
    "AuditLog": AuditLog,
    "RecyclingAlerts": RecyclingAlerts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};