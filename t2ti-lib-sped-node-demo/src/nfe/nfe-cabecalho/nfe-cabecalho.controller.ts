/*******************************************************************************
Title: T2Ti ERP Fenix                                                                
Description: Controller relacionado à tabela [NFE_CABECALHO] 
                                                                                
The MIT License                                                                 
                                                                                
Copyright: Copyright (C) 2020 T2Ti.COM                                          
                                                                                
Permission is hereby granted, free of charge, to any person                     
obtaining a copy of this software and associated documentation                  
files (the "Software"), to deal in the Software without                         
restriction, including without limitation the rights to use,                    
copy, modify, merge, publish, distribute, sublicense, and/or sell               
copies of the Software, and to permit persons to whom the                       
Software is furnished to do so, subject to the following                        
conditions:                                                                     
                                                                                
The above copyright notice and this permission notice shall be                  
included in all copies or substantial portions of the Software.                 
                                                                                
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,                 
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES                 
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND                        
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT                     
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,                    
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING                    
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR                   
OTHER DEALINGS IN THE SOFTWARE.                                                 
                                                                                
       The author may be contacted at:                                          
           t2ti.com@gmail.com                                                   
                                                                                
@author Albert Eije (alberteije@gmail.com)                    
@version 1.0.0
*******************************************************************************/
import { Controller, Delete, Param, Post, Put, Req, Res, Get, Header, HttpCode } from '@nestjs/common';
import { Crud, CrudController } from '@nestjsx/crud';
import { NfeCabecalhoService } from './nfe-cabecalho.service';
import { NfeCabecalho } from './nfe-cabecalho.entity';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';

@Crud({
  model: {
    type: NfeCabecalho,
  },
  query: {
    join: {
		nfeCana: { eager: true },
		nfeDestinatario: { eager: true },
		nfeEmitente: { eager: true },
		nfeFatura: { eager: true },
		nfeInformacaoPagamento: { eager: true },
		nfeLocalEntrega: { eager: true },
		nfeLocalRetirada: { eager: true },
		nfeResponsavelTecnico: { eager: true },
		nfeTransporte: { eager: true },
		vendedor: { eager: true },
		fornecedor: { eager: true },
		cliente: { eager: true },
		tributOperacaoFiscal: { eager: true },
		vendaCabecalho: { eager: true },
		listaNfeAcessoXml: { eager: true },
		listaNfeCteReferenciado: { eager: true },
		listaNfeCupomFiscalReferenciado: { eager: true },
		listaNfeDetalhe: { eager: true },
		"listaNfeDetalhe.nfeDetEspecificoCombustivel": { eager: true },
		"listaNfeDetalhe.nfeDetEspecificoMedicamento": { eager: true },
		"listaNfeDetalhe.nfeDetEspecificoVeiculo": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoCofins": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoCofinsSt": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoIcms": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoIcmsUfdest": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoIi": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoIpi": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoIssqn": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoPis": { eager: true },
		"listaNfeDetalhe.nfeDetalheImpostoPisSt": { eager: true },
		"listaNfeDetalhe.produto": { eager: true },
		"listaNfeDetalhe.listaNfeDeclaracaoImportacao": { eager: true },
		"listaNfeDetalhe.listaNfeDetEspecificoArmamento": { eager: true },
		"listaNfeDetalhe.listaNfeExportacao": { eager: true },
		"listaNfeDetalhe.listaNfeItemRastreado": { eager: true },
		"listaNfeDetalhe.listaNfeCabecalho": { eager: true },
		listaNfeNfReferenciada: { eager: true },
		listaNfeProcessoReferenciado: { eager: true },
		listaNfeProdRuralReferenciada: { eager: true },
		listaNfeReferenciada: { eager: true },
    },
  },
})
@Controller('nfe-cabecalho')
export class NfeCabecalhoController implements CrudController<NfeCabecalho> {
  constructor(public service: NfeCabecalhoService) { }

	@Post()
	async inserir(@Req() request: Request) {
		let objetoJson = request.body;
		let nfeCabecalho = new NfeCabecalho(objetoJson);
		const retorno = await this.service.persistir(nfeCabecalho, 'I');
		return retorno;
	}

	@Put(':id')
	async alterar(@Param('id') id: number, @Req() request: Request) {
		let objetoJson = request.body;
		let nfeCabecalho = new NfeCabecalho(objetoJson);
		const retorno = await this.service.persistir(nfeCabecalho, 'A');
		return retorno;
	}

	@Delete(':id')
	async excluir(@Param('id') id: number) {
		return this.service.excluirMestreDetalhe(id);
	}
  
	@Post('calcula-totais')
	async calcularTotais(@Req() request: Request) {
		let objetoJson = request.body;
		let nfeCabecalho = new NfeCabecalho(objetoJson);
		const retorno = await this.service.calcularTotais(nfeCabecalho);
		return retorno;
	}

	@Post('transmite-nfe')
	async transmitirNfe(@Req() request: Request) {
		let objetoJson = request.body;
		let nfeCabecalho = new NfeCabecalho(objetoJson);
		const retorno = await this.service.transmitirNfe(nfeCabecalho);
		return retorno;
	}

	@HttpCode(200)
	@Get('gera-pdf-nfe')
	@Header('Content-Type', 'application/pdf')
	gerarPdfNfe(@Res() response: Response) {
	   const data = createReadStream("C:\\ACBrMonitor\\PDF\\10793118000178\\NFe\\202006\\NFe\\53200610793118000178550010000020111900020116-nfe.pdf");
	   data.pipe(response);
	}

}