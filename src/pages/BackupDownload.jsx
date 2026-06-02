import React, { useState } from 'react';
import { Download, FileText, Archive, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function BackupDownload() {
  const [downloading, setDownloading] = useState(false);

  // Arquivo consolidado já existe no servidor
  const arquivos = [
    {
      nome: 'DOCUMENTACAO_TECNICA_CAT_GESTAO_CURSOS.md',
      tamanho: '51KB',
      descricao: 'Arquitetura técnica completa, módulos, entidades, permissões'
    },
    {
      nome: 'CODIGO_COMPLETO_CAT_GESTAO_CURSOS.md',
      tamanho: '38KB',
      descricao: 'Código-fonte principal: App.jsx, layout, contexts, estrutura'
    },
    {
      nome: 'PLANO_EXPORTACAO_MIGRACAO_CAT.md',
      tamanho: '43KB',
      descricao: 'Plano de migração, scripts de export/import, 12 problemas catalogados'
    },
    {
      nome: 'INDEX_BACKUP_COMPLETO.md',
      tamanho: '12KB',
      descricao: 'Índice de navegação, guias rápidos, próximos passos'
    },
    {
      nome: 'BACKUP_CAT_COMPLETO_CONSOLIDADO.txt',
      tamanho: '38KB',
      descricao: 'TUDO EM UM ARQUIVO - Consolidado com 14 seções completas'
    }
  ];

  const handleDownloadArquivo = async (nomeArquivo) => {
    try {
      setDownloading(true);
      
      // Caminho relativo do arquivo no projeto
      const url = `/src/${nomeArquivo}`;
      
      // Criar link de download
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`✓ Download de ${nomeArquivo} iniciado`);
    } catch (error) {
      toast.error(`Erro ao baixar ${nomeArquivo}`);
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTodos = async () => {
    try {
      setDownloading(true);
      
      // Fazer download do arquivo consolidado primeiro (mais fácil)
      const url = `/src/BACKUP_CAT_COMPLETO_CONSOLIDADO.txt`;
      const link = document.createElement('a');
      link.href = url;
      link.download = 'BACKUP_CAT_COMPLETO_CONSOLIDADO.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('✓ Download do backup completo iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar backup');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📥 Centro de Download
          </h1>
          <p className="text-lg text-gray-600">
            Baixe a documentação completa, código-fonte e planos de migração do sistema
          </p>
        </div>

        {/* Botão Principal - Download Tudo */}
        <Card className="mb-8 border-2 border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-6 h-6 text-blue-600" />
              Download Completo
            </CardTitle>
            <CardDescription>
              Um arquivo com tudo consolidado (144KB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownloadTodos}
              disabled={downloading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
            >
              {downloading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4">⏳</div>
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  BACKUP_CAT_COMPLETO_CONSOLIDADO.txt (38KB)
                </>
              )}
            </Button>
            <p className="mt-4 text-sm text-gray-700">
              ✓ Contém tudo em um arquivo único<br/>
              ✓ Fácil de compartilhar<br/>
              ✓ 14 seções completas
            </p>
          </CardContent>
        </Card>

        {/* Arquivos Individuais */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ou baixe individualmente:
          </h2>
          <div className="grid gap-4">
            {arquivos.map((arquivo, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-500" />
                        {arquivo.nome}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {arquivo.descricao}
                      </CardDescription>
                    </div>
                    <span className="text-sm font-semibold text-gray-500 ml-4">
                      {arquivo.tamanho}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleDownloadArquivo(arquivo.nome)}
                    disabled={downloading}
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    {downloading ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4">⏳</div>
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Informações */}
        <Card className="bg-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Informações Úteis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Conteúdo Incluído:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>✓ Documentação técnica completa (51KB)</li>
                <li>✓ Código-fonte mapeado (38KB)</li>
                <li>✓ Plano de migração em 6 fases (43KB)</li>
                <li>✓ Índice de navegação e guias (12KB)</li>
                <li>✓ 40+ páginas documentadas</li>
                <li>✓ 38 entidades com schemas</li>
                <li>✓ 50+ funções backend</li>
                <li>✓ 5 integrações externas</li>
                <li>✓ 12 problemas conhecidos com soluções</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Caso de Uso:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>📋 Backup e archival do sistema</li>
                <li>🔄 Planejamento de migração</li>
                <li>📖 Onboarding de novos desenvolvedores</li>
                <li>🔍 Auditoria interna/externa</li>
                <li>📊 Análise de arquitetura</li>
                <li>💾 Disaster recovery</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Data de Geração:</h3>
              <p className="text-gray-700">2026-06-02 - Backup Completo e Atualizado</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Todos os arquivos estão armazenados localmente no projeto</p>
          <p>Acesse via painel de arquivos em caso de dificuldades</p>
        </div>
      </div>
    </div>
  );
}