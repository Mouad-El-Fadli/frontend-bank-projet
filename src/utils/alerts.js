import Swal from 'sweetalert2';

// Theme colors from BP Branding
const colors = {
  primary: '#f58220', // Orange BP
  secondary: '#3d1a10', // Deep Brown
  background: '#ffffff', // White
  text: '#0f172a', // Slate 900
};

const CustomSwal = Swal.mixin({
  background: colors.background,
  color: colors.text,
  confirmButtonColor: colors.primary,
  cancelButtonColor: '#e2e8f0', // Slate 200
  customClass: {
    popup: 'rounded-[1.5rem] border border-slate-200 shadow-2xl',
    title: 'text-2xl font-bold text-slate-800',
    htmlContainer: 'text-slate-500 font-medium',
    confirmButton: 'rounded-xl px-6 py-2.5 font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/30',
    cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600 transition-transform hover:bg-slate-100',
  },
  backdrop: `rgba(15, 23, 42, 0.4)`,
  showClass: {
    popup: 'animate__animated animate__zoomIn animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOut animate__faster'
  }
});

export const alerts = {
  success: (title, text) => {
    return CustomSwal.fire({
      icon: 'success',
      iconColor: '#10b981', // Emerald 500
      title,
      text,
      timer: 2500,
      showConfirmButton: true,
      confirmButtonText: 'OK'
    });
  },
  
  error: (title, text) => {
    return CustomSwal.fire({
      icon: 'error',
      iconColor: '#ef4444', // Red 500
      title,
      text,
    });
  },
  
  info: (title, text) => {
    return CustomSwal.fire({
      icon: 'info',
      iconColor: colors.primary,
      title,
      text,
    });
  },
  
  confirm: (title, text, confirmText = 'Confirmer', cancelText = 'Annuler') => {
    return CustomSwal.fire({
      title,
      html: text,
      icon: 'question',
      iconColor: colors.primary,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
  },

  toast: (title, icon = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: colors.background,
      color: colors.text,
      customClass: {
        popup: 'rounded-xl shadow-lg border border-slate-100',
      },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    return Toast.fire({
      icon,
      title
    });
  }
};

export default alerts;
