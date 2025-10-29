import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Schedule from './pages/Schedule';
import Instructors from './pages/Instructors';
import Courses from './pages/Courses';
import Reports from './pages/Reports';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Import": Import,
    "Schedule": Schedule,
    "Instructors": Instructors,
    "Courses": Courses,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};