import { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { alerts } from '../utils/alerts';

/**
 * Composant générique d'export (Excel/PDF)
 * @param {Array} data - Les données complètes (fallback si fetchFullData n'est pas fourni)
 * @param {Array} filteredData - Les données visuellement filtrées actuellement
 * @param {Array} columns - Configuration des colonnes [{ header: 'Titre', accessor: (row) => row.val || '' }]
 * @param {String} fileName - Préfixe du fichier généré (ex: 'parc-materiel')
 * @param {String} reportTitle - Titre principal à l'intérieur du PDF
 * @param {Function} fetchFullData - Fonction optionnelle renvoyant une Promise avec toutes les données (cas pagination)
 */
export default function ExportButton({
  data = [],
  filteredData = [],
  columns = [],
  fileName = 'export',
  reportTitle = 'Rapport Exporté',
  fetchFullData = null
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportAction = async (type) => {
    setExporting(true);
    setExportOpen(false);
    
    setTimeout(async () => {
      try {
        let dataToExport = [];
        if (type === 'excel_all') {
          if (fetchFullData) {
            dataToExport = await fetchFullData();
          } else {
            dataToExport = data;
          }
        } else {
          dataToExport = filteredData;
        }

        if (!dataToExport || dataToExport.length === 0) {
          alerts.error('Info', 'Aucune donnée à exporter.');
          setExporting(false);
          return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        
        // Extraction des headers et des lignes
        const headers = columns.map(c => c.header);
        const rows = dataToExport.map(row => 
          columns.map(c => typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor] || '')
        );

        if (type.startsWith('excel')) {
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
          XLSX.writeFile(workbook, `${fileName}-${dateStr}.xlsx`);
        } else if (type === 'pdf') {
          const doc = new jsPDF('landscape');
          
          doc.setFontSize(18);
          doc.text(reportTitle, 14, 22);
          doc.setFontSize(11);
          doc.setTextColor(100);
          doc.text(`Édité le ${dateStr} - Banque Populaire`, 14, 30);
          
          doc.autoTable({
            startY: 40,
            head: [headers],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [232, 105, 11] },
            styles: { fontSize: 9 },
          });
          
          doc.save(`${fileName}-${dateStr}.pdf`);
        }
        
        // Petit feedback silencieux de succès (optionnel)
      } catch (err) {
        console.error("Export error", err);
        alerts.error('Erreur', 'La génération du fichier a échoué. Assurez-vous d\'avoir les droits et les données requises.');
      } finally {
        setExporting(false);
      }
    }, 100); // Court timeout pour laisser le temps au spinner de s'afficher
  };

  return (
    <div className="relative" ref={exportRef}>
      <button
        onClick={() => setExportOpen(!exportOpen)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all shadow-sm shadow-black/5 disabled:opacity-50 h-full"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Exporter</span>
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>
      
      {exportOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => exportAction('excel_all')}
            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm border-b border-[var(--border-color)]/50 transition-colors flex items-center gap-3"
          >
            <span className="text-emerald-500 text-lg leading-none">📊</span>
            <span>Excel — liste complète</span>
          </button>
          <button
            onClick={() => exportAction('excel_filtered')}
            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm border-b border-[var(--border-color)]/50 transition-colors flex items-center gap-3"
          >
            <span className="text-emerald-400 text-lg leading-none">📊</span>
            <span>Excel — filtre actuel</span>
          </button>
          <button
            onClick={() => exportAction('pdf')}
            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm transition-colors flex items-center gap-3"
          >
            <span className="text-red-500 text-lg leading-none">📄</span>
            <span>PDF — rapport officiel</span>
          </button>
        </div>
      )}
    </div>
  );
}
