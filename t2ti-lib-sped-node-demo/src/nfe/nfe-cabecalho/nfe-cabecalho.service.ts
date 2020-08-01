/*******************************************************************************
Title: T2Ti ERP Fenix                                                                
Description: Service relacionado à tabela [NFE_CABECALHO] 
                                                                                
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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { NfeCabecalho } from '../../entities-export';
import { Empresa } from '../../entities-export';
import { EmpresaEndereco } from '../../entities-export';
import { getConnection, QueryRunner } from 'typeorm';
import { CalculoNfeModel } from '../../util/calculoNfe.model';
import { NfeCalculoService } from './nfe-calculo.service';
import { Biblioteca } from '../../util/biblioteca';
import * as fs from "fs";
import * as INI from "easy-ini";

@Injectable()
export class NfeCabecalhoService extends TypeOrmCrudService<NfeCabecalho> {

	constructor(
		@InjectRepository(NfeCabecalho) repository) { super(repository); }

	async persistir(nfeCabecalho: NfeCabecalho, operacao: String): Promise<NfeCabecalho> {
		let objetoRetorno: NfeCabecalho;

		const connection = getConnection();
		const queryRunner = connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction();
		try {
			if (operacao == 'A') {
				await this.excluirFilhos(queryRunner, nfeCabecalho.id);
			}
			objetoRetorno = await queryRunner.manager.save(nfeCabecalho);
			await queryRunner.commitTransaction();
		} catch (erro) {
			await queryRunner.rollbackTransaction();
			throw (erro);
		} finally {
			await queryRunner.release();
		}
		return objetoRetorno;
	}

	async excluirMestreDetalhe(id: number) {
		const connection = getConnection();
		const queryRunner = connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction();
		try {
			await this.excluirFilhos(queryRunner, id);
			await queryRunner.query('delete from nfeCabecalho where id=' + id);
			await queryRunner.commitTransaction();
		} catch (erro) {
			await queryRunner.rollbackTransaction();
			throw (erro);
		} finally {
			await queryRunner.release();
		}
	}

	async excluirFilhos(queryRunner: QueryRunner, id: number) {
		await queryRunner.query('delete from NFE_ACESSO_XML where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_CANA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_CTE_REFERENCIADO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_CUPOM_FISCAL_REFERENCIADO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_DESTINATARIO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_DETALHE where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_EMITENTE where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_FATURA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_INFORMACAO_PAGAMENTO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_LOCAL_ENTREGA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_LOCAL_RETIRADA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_NF_REFERENCIADA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_PROCESSO_REFERENCIADO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_PROD_RURAL_REFERENCIADA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_REFERENCIADA where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_RESPONSAVEL_TECNICO where ID_NFE_CABECALHO=' + id);
		await queryRunner.query('delete from NFE_TRANSPORTE where ID_NFE_CABECALHO=' + id);
	}

	async calcularTotais(pNfeCabecalho: NfeCabecalho): Promise<NfeCabecalho> {
		//  Se houver CFOP cadastrado na Operação Fiscal, a nota é de serviços
		if (pNfeCabecalho.tributOperacaoFiscal.cfop > 0) {
			pNfeCabecalho.listaNfeDetalhe.forEach(nfeDetalhe => {
				pNfeCabecalho.valorServicos += nfeDetalhe.valorTotal;
				pNfeCabecalho.valorFrete += nfeDetalhe.valorFrete;
				pNfeCabecalho.valorSeguro += nfeDetalhe.valorSeguro;
				pNfeCabecalho.valorDespesasAcessorias += nfeDetalhe.valorOutrasDespesas;
				pNfeCabecalho.valorDesconto += nfeDetalhe.valorDesconto;
				pNfeCabecalho.baseCalculoIssqn += nfeDetalhe.nfeDetalheImpostoIssqn.baseCalculoIssqn;
				pNfeCabecalho.valorIssqn += nfeDetalhe.nfeDetalheImpostoIssqn.valorIssqn;
				pNfeCabecalho.valorPisIssqn += nfeDetalhe.nfeDetalheImpostoPis.valorPis;
				pNfeCabecalho.valorCofinsIssqn = nfeDetalhe.nfeDetalheImpostoCofins.valorCofins;
			});
			// 
			pNfeCabecalho.valorTotal = pNfeCabecalho.valorServicos + pNfeCabecalho.valorPisIssqn + pNfeCabecalho.valorCofinsIssqn + pNfeCabecalho.valorDespesasAcessorias - pNfeCabecalho.valorDesconto;
			pNfeCabecalho.valorServicos = pNfeCabecalho.valorServicos;
		}
		else {
			await this.processarCalculosNoItem(pNfeCabecalho);
		}
		return pNfeCabecalho;
	}

	async processarCalculosNoItem(pNfeCabecalho: NfeCabecalho) {
		//  Pega a empresa
		let empresa: Empresa;
		const connection = getConnection();
		empresa = await connection.manager.findOne(Empresa, 1);

		let calculoNFe = new CalculoNfeModel();
		if (empresa.crt != "")
			calculoNFe.crtEmissor = parseInt(empresa.crt);
		calculoNFe.ufEmissor = empresa.codigoIbgeUf;
		if (pNfeCabecalho.nfeDestinatario.cnpj != "")
			calculoNFe.tipoCliente = "J";
		else
			calculoNFe.tipoCliente = "F";
		calculoNFe.ufCliente = pNfeCabecalho.nfeDestinatario.uf;

		pNfeCabecalho.listaNfeDetalhe.forEach(async nfeDetalhe => {
			calculoNFe.valorBrutoProdutos = nfeDetalhe.valorBrutoProduto;
			calculoNFe.valorFrete = nfeDetalhe.valorFrete;
			calculoNFe.valorSeguro = nfeDetalhe.valorSeguro;
			calculoNFe.valorOutrasDespesas = nfeDetalhe.valorOutrasDespesas;
			calculoNFe.valorDesconto = nfeDetalhe.valorDesconto;
			calculoNFe.cstIcms = nfeDetalhe.nfeDetalheImpostoIcms.cstIcms;
			calculoNFe.csosn = nfeDetalhe.nfeDetalheImpostoIcms.csosn;
			calculoNFe.modalidadeBcIcms = nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms;
			calculoNFe.taxaReducaoBcIcms = nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms;
			calculoNFe.aliquotaIcms = nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms;
			calculoNFe.aliquotaIcmsInter = nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms;
			calculoNFe.modalidadeBcIcmsSt = nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt;
			calculoNFe.percentualMvaIcmsSt = nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt;
			calculoNFe.reducaoBcIcmsSt = nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt;
			calculoNFe.aliquotaIcmsSt = nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt;
			calculoNFe.aliquotaCreditoIcmsSn = nfeDetalhe.nfeDetalheImpostoIcms.aliquotaCreditoIcmsSn;
			calculoNFe.cstIpi = nfeDetalhe.nfeDetalheImpostoIpi.cstIpi;
			calculoNFe.aliquotaIpi = nfeDetalhe.nfeDetalheImpostoIpi.aliquotaIpi;
			calculoNFe.cstPis = nfeDetalhe.nfeDetalheImpostoPis.cstPis;
			calculoNFe.aliquotaPis = nfeDetalhe.nfeDetalheImpostoPis.aliquotaPisPercentual;
			calculoNFe.aliquotaPisReais = nfeDetalhe.nfeDetalheImpostoPis.aliquotaPisReais;
			calculoNFe.cstCofins = nfeDetalhe.nfeDetalheImpostoCofins.cstCofins;
			calculoNFe.aliquotaCofins = nfeDetalhe.nfeDetalheImpostoCofins.aliquotaCofinsPercentual;
			calculoNFe.aliquotaCofinsReais = nfeDetalhe.nfeDetalheImpostoCofins.aliquotaCofinsReais;

			NfeCalculoService.calcular(calculoNFe, async (pCalculoNFe: CalculoNfeModel) => {
				//  valores ICMS 
				nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms = calculoNFe.baseCalculoIcms;
				nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt = calculoNFe.reducaoBcIcmsSt;
				nfeDetalhe.nfeDetalheImpostoIcms.valorIcms = calculoNFe.valorIcms;
				//  valores de ICMS ST
				nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt = calculoNFe.baseCalculoIcmsSt;
				nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt = calculoNFe.valorIcmsSt;
				//  credito de icmssn
				nfeDetalhe.nfeDetalheImpostoIcms.valorCreditoIcmsSn = calculoNFe.valorCreditoIcmsSn;

				//  valores IPI 
				nfeDetalhe.nfeDetalheImpostoIpi.valorBaseCalculoIpi = calculoNFe.baseCalculoIpi;
				nfeDetalhe.nfeDetalheImpostoIpi.valorIpi = calculoNFe.valorIpi;

				//  valores PIS 
				nfeDetalhe.nfeDetalheImpostoPis.valorBaseCalculoPis = calculoNFe.baseCalculoPis;
				nfeDetalhe.nfeDetalheImpostoPis.valorPis = calculoNFe.valorPis;

				//  valores COFINS 
				nfeDetalhe.nfeDetalheImpostoCofins.baseCalculoCofins = calculoNFe.baseCalculoCofins;
				nfeDetalhe.nfeDetalheImpostoCofins.valorCofins = calculoNFe.valorCofins;

				// atualiza totais da nota
				pNfeCabecalho.valorTotalProdutos += nfeDetalhe.valorTotal;
				pNfeCabecalho.valorFrete += nfeDetalhe.valorFrete;
				pNfeCabecalho.valorSeguro += nfeDetalhe.valorSeguro;
				pNfeCabecalho.valorDespesasAcessorias += nfeDetalhe.valorOutrasDespesas;
				pNfeCabecalho.valorDesconto += nfeDetalhe.valorDesconto;
				pNfeCabecalho.baseCalculoIcms += nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms;
				pNfeCabecalho.valorIcms += nfeDetalhe.nfeDetalheImpostoIcms.valorIcms;
				pNfeCabecalho.baseCalculoIcmsSt += nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt;
				pNfeCabecalho.valorIcmsSt += nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt;
				pNfeCabecalho.valorIpi += nfeDetalhe.nfeDetalheImpostoIpi.valorIpi;
				pNfeCabecalho.valorPis += nfeDetalhe.nfeDetalheImpostoPis.valorPis;
				pNfeCabecalho.valorCofins += nfeDetalhe.nfeDetalheImpostoCofins.valorCofins;
				// 
				pNfeCabecalho.valorTotal = pNfeCabecalho.valorTotalProdutos + pNfeCabecalho.valorIcmsSt + pNfeCabecalho.valorPis
					+ pNfeCabecalho.valorCofins + pNfeCabecalho.valorIpi + pNfeCabecalho.valorDespesasAcessorias
					- pNfeCabecalho.valorDesconto;
			});

		});
	}

	async transmitirNfe(pNfeCabecalho: NfeCabecalho): Promise<string> {
		//  primeiro passo - gerar o arquivo INI com a NF-e
		await this.gerarArquivoIniNFe(pNfeCabecalho);
		//  segundo passo - criar o arquivo de entrada com o comando - ex: NFE.CriarEnviarNFe("C:\T2Ti\NFe\ini\000002006.ini", "001", , , , , , "1")
		await this.gerarArquivoEntradaNFe(pNfeCabecalho);
		//  terceiro passo - capturar o retorno do arquivo SAI
		return await this.pegarRetornoSaidaNFe(pNfeCabecalho);	
	}

	async gerarArquivoEntradaNFe(pNfeCabecalho: NfeCabecalho) {
		//  apaga o arquivo 'SAI.TXT'
		let nomeArquivoApagar = "c:\\ACBrMonitor\\sai.txt";
		try {
			fs.unlinkSync(nomeArquivoApagar);
			//file removed
		} catch(err) {
			console.error(err);
		}		
		  
		//  cria o arquivo 'ENT.TXT'
		let nomeArquivo = "c:\\ACBrMonitor\\ENT.TXT";
		let conteudoArquivo = 'NFE.CriarEnviarNFe(\"C:\\T2Ti\\NFe\\ini\\' + pNfeCabecalho.numero + '.ini\", \"001\", , , , , , \"1\")';
		fs.writeFileSync(nomeArquivo, conteudoArquivo);
	}

	async pegarRetornoSaidaNFe(pNfeCabecalho: NfeCabecalho): Promise<string> {
		while (!fs.existsSync("C:\\ACBrMonitor\\sai.txt"))
		{
			//  qual a melhor forma de esperar que um arquivo seja criado?
			//  e se o arquivo nunca for criado, como tratar esse problema?
		}

		let nomeArquivo = "c:\\ACBrMonitor\\sai.txt";
		const ArquivoSaida = new INI(fs.readFileSync(nomeArquivo, {encoding: 'utf8'}))

		//return ArquivoSaida.getKeyIfExists('xMotivo').val.toString();
		return "Nota Emitida com Sucesso";

		/// Exercício
		/// Carregue como retorno todo o conteudo da seção [Retorno] do arquivo 'sai.txt'
	}

	async gerarArquivoIniNFe(pNfeCabecalho: NfeCabecalho) {
		//  Pega a empresa
		let empresa: Empresa;
		const connection = getConnection();
		empresa = await connection.manager.findOne(Empresa, 1);
		empresa.setEnderecoPrincipal(await connection.manager.findOne(EmpresaEndereco, 1));

		let nomeArquivo = "c:\\t2ti\\nfe\\ini\\" + pNfeCabecalho.numero + ".ini";
		fs.writeFileSync(nomeArquivo, "");
		const NFeIni = new INI(fs.readFileSync(nomeArquivo, {encoding: 'utf8'}))

		// *******************************************************************************************
		//   [infNFe]
		// *******************************************************************************************
		Biblioteca.iniWriteString("infNFe", "versao", "4.00", NFeIni);

		// *******************************************************************************************
		//   [Identificacao]
		// *******************************************************************************************
		Biblioteca.iniWriteString("Identificacao", "cNF", pNfeCabecalho.codigoNumerico, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "natOp", pNfeCabecalho.naturezaOperacao, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "mod", "55", NFeIni);
		Biblioteca.iniWriteString("Identificacao", "serie", "001", NFeIni);
		Biblioteca.iniWriteString("Identificacao", "nNF", pNfeCabecalho.numero, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "dhEmi", "23/06/2020 02:00:00", NFeIni);//pNfeCabecalho.dataHoraEmissao.toString(), NFeIni);
		Biblioteca.iniWriteString("Identificacao", "dhSaiEnt", "", NFeIni);
		Biblioteca.iniWriteString("Identificacao", "tpNF", pNfeCabecalho.tipoOperacao, NFeIni);    // 0=Entrada; 1=Saída
		Biblioteca.iniWriteString("Identificacao", "idDest", pNfeCabecalho.localDestino, NFeIni);  //  1=Operação interna; 2=Operação interestadual; 3=Operação com exterior.
		Biblioteca.iniWriteString("Identificacao", "tpImp", pNfeCabecalho.formatoImpressaoDanfe, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "tpEmis", pNfeCabecalho.tipoEmissao, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "finNFe", pNfeCabecalho.finalidadeEmissao, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "indFinal", pNfeCabecalho.consumidorOperacao, NFeIni); // 0=Normal; 1=Consumidor final;
		Biblioteca.iniWriteString("Identificacao", "indPres", pNfeCabecalho.consumidorPresenca, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "procEmi", pNfeCabecalho.processoEmissao, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "verProc", pNfeCabecalho.versaoProcessoEmissao, NFeIni);
		Biblioteca.iniWriteString("Identificacao", "dhCont", "", NFeIni);
		Biblioteca.iniWriteString("Identificacao", "xJust", "", NFeIni);
		Biblioteca.iniWriteString("Identificacao", "tpAmb", "2", NFeIni); //  altera para '1' quando em produção ou trazer de tabela ADM

		// *******************************************************************************************
		//   [Emitente]
		// *******************************************************************************************
		Biblioteca.iniWriteString("Emitente", "CNPJCPF", empresa.cnpj, NFeIni);
		Biblioteca.iniWriteString("Emitente", "xNome", empresa.razaoSocial, NFeIni);
		Biblioteca.iniWriteString("Emitente", "xFant", empresa.nomeFantasia, NFeIni);
		Biblioteca.iniWriteString("Emitente", "IE", empresa.inscricaoEstadual, NFeIni);
		Biblioteca.iniWriteString("Emitente", "IEST", "", NFeIni);
		Biblioteca.iniWriteString("Emitente", "IM", empresa.inscricaoMunicipal, NFeIni);
		Biblioteca.iniWriteString("Emitente", "CNAE", empresa.codigoCnaePrincipal, NFeIni);
		Biblioteca.iniWriteString("Emitente", "CRT", empresa.crt, NFeIni);
		Biblioteca.iniWriteString("Emitente", "xLgr", empresa.enderecoPrincipal.logradouro, NFeIni);
		Biblioteca.iniWriteString("Emitente", "nro", empresa.enderecoPrincipal.numero, NFeIni);
		Biblioteca.iniWriteString("Emitente", "xCpl", empresa.enderecoPrincipal.complemento, NFeIni);
		Biblioteca.iniWriteString("Emitente", "xBairro", empresa.enderecoPrincipal.bairro, NFeIni);
		Biblioteca.iniWriteString("Emitente", "cMun", empresa.codigoIbgeCidade.toString(), NFeIni);
		Biblioteca.iniWriteString("Emitente", "xMun", empresa.enderecoPrincipal.cidade, NFeIni);
		Biblioteca.iniWriteString("Emitente", "UF", empresa.enderecoPrincipal.uf, NFeIni);
		Biblioteca.iniWriteString("Emitente", "CEP", empresa.enderecoPrincipal.cep, NFeIni);
		Biblioteca.iniWriteString("Emitente", "cPais", "1058", NFeIni);
		Biblioteca.iniWriteString("Emitente", "xPais", "BRASIL", NFeIni);
		Biblioteca.iniWriteString("Emitente", "Fone", "", NFeIni);
		Biblioteca.iniWriteString("Emitente", "cUF", empresa.codigoIbgeUf.toString(), NFeIni);
		Biblioteca.iniWriteString("Emitente", "cMunFG", "", NFeIni);

		// *******************************************************************************************
		//   [Destinatario]
		// *******************************************************************************************
		if (pNfeCabecalho.nfeDestinatario.cnpj != "")
			Biblioteca.iniWriteString("Destinatario", "CNPJCPF", pNfeCabecalho.nfeDestinatario.cnpj, NFeIni);
		else
			Biblioteca.iniWriteString("Destinatario", "CNPJCPF", pNfeCabecalho.nfeDestinatario.cpf, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xNome", pNfeCabecalho.nfeDestinatario.nome, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "indIEDest", pNfeCabecalho.nfeDestinatario.indicadorIe, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "IE", pNfeCabecalho.nfeDestinatario.inscricaoEstadual, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "email", pNfeCabecalho.nfeDestinatario.email, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xLgr", pNfeCabecalho.nfeDestinatario.logradouro, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "nro", pNfeCabecalho.nfeDestinatario.numero, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xCpl", pNfeCabecalho.nfeDestinatario.complemento, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xBairro", pNfeCabecalho.nfeDestinatario.bairro, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "cMun", pNfeCabecalho.nfeDestinatario.codigoMunicipio.toString(), NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xMun", pNfeCabecalho.nfeDestinatario.nomeMunicipio, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "UF", pNfeCabecalho.nfeDestinatario.uf, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "CEP", pNfeCabecalho.nfeDestinatario.cep, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "cPais", pNfeCabecalho.nfeDestinatario.codigoPais.toString(), NFeIni);
		Biblioteca.iniWriteString("Destinatario", "xPais", pNfeCabecalho.nfeDestinatario.nomePais, NFeIni);
		Biblioteca.iniWriteString("Destinatario", "Fone", "", NFeIni);

		// *******************************************************************************************
		//   Detalhes - Produtos e Impostos
		// *******************************************************************************************
		let i = 0;
		pNfeCabecalho.listaNfeDetalhe.forEach(async nfeDetalhe => {
			i++;    
			let tamanhoI = i.toString().length;
			let incrementoBloco = "0".repeat(3 - tamanhoI) + i.toString();

			// / [Produto]
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "cProd", nfeDetalhe.gtin, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "cEAN", nfeDetalhe.gtin, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "xProd", nfeDetalhe.nomeProduto, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "ncm", nfeDetalhe.ncm, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "CEST", nfeDetalhe.cest, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "EXTIPI", "", NFeIni);// nfeDetalhe.extipi.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "CFOP", nfeDetalhe.cfop.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "uCom", nfeDetalhe.unidadeComercial, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "qCom", nfeDetalhe.quantidadeComercial.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vUnCom", nfeDetalhe.valorUnitarioComercial.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vProd", nfeDetalhe.valorTotal.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "cEANTrib", nfeDetalhe.gtinUnidadeTributavel, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "uTrib", nfeDetalhe.unidadeTributavel, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "qTrib", nfeDetalhe.quantidadeTributavel.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vUnTrib", nfeDetalhe.valorUnitarioTributavel.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vFrete", nfeDetalhe.valorFrete.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vSeg", nfeDetalhe.valorSeguro.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vDesc", nfeDetalhe.valorDesconto.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vOutro", nfeDetalhe.valorOutrasDespesas.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "indTot", nfeDetalhe.entraTotal, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "xPed", pNfeCabecalho.compraPedido, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "nItemPed", nfeDetalhe.itemPedidoCompra.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "nFCI", nfeDetalhe.numeroFci, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "nRECOPI", nfeDetalhe.numeroRecopi, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "pDevol", nfeDetalhe.percentualDevolvido.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vIPIDevol", nfeDetalhe.valorIpiDevolvido.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "vTotTrib", nfeDetalhe.valorTotalTributos.toString(), NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "infAdProd", nfeDetalhe.informacoesAdicionais, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "indEscala", nfeDetalhe.indicadorEscalaRelevante, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "CNPJFab", nfeDetalhe.cnpjFabricante, NFeIni);
			Biblioteca.iniWriteString("Produto" + incrementoBloco, "cBenef", nfeDetalhe.codigoBeneficioFiscal, NFeIni);

			//  Detalhes -- Impostos 
			//  Se houver CFOP cadastrado na Operação Fiscal, a nota é de serviços
			if (pNfeCabecalho.tributOperacaoFiscal.cfop > 0)
			{
				// / [ISSQN]
				Biblioteca.iniWriteString("ISSQN" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIssqn.baseCalculoIssqn.toString(), NFeIni);
				Biblioteca.iniWriteString("ISSQN" + incrementoBloco, "vAliq", nfeDetalhe.nfeDetalheImpostoIssqn.aliquotaIssqn.toString(), NFeIni);
				Biblioteca.iniWriteString("ISSQN" + incrementoBloco, "vISSQN", nfeDetalhe.nfeDetalheImpostoIssqn.valorIssqn.toString(), NFeIni);
				Biblioteca.iniWriteString("ISSQN" + incrementoBloco, "cMunFG", nfeDetalhe.nfeDetalheImpostoIssqn.municipioIssqn.toString(), NFeIni);
				Biblioteca.iniWriteString("ISSQN" + incrementoBloco, "cListServ", nfeDetalhe.nfeDetalheImpostoIssqn.itemListaServicos.toString(), NFeIni);
			}
			else
			{
				// / [ICMS]
				if (empresa.crt == "1")  // 1-Simples Nacional
				{
					Biblioteca.iniWriteString("ICMS" + incrementoBloco, "CSOSN", nfeDetalhe.nfeDetalheImpostoIcms.csosn, NFeIni);

					//  csosn 101
					if (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "101")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pCredSN", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaCreditoIcmsSn.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vCredICMSSN", nfeDetalhe.nfeDetalheImpostoIcms.valorCreditoIcmsSn.toString(), NFeIni);
					}

					//  csosn 102, 103, 300, 400
					else if ((nfeDetalhe.nfeDetalheImpostoIcms.csosn == "102")
							|| (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "103")
							|| (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "300")
							|| (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "400"))
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
					}

					//  csosn 201
					else if (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "201")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pCredSN", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaCreditoIcmsSn.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vCredICMSSN", nfeDetalhe.nfeDetalheImpostoIcms.valorCreditoIcmsSn.toString(), NFeIni);
					}

					//  csosn 202, 203
					else if ((nfeDetalhe.nfeDetalheImpostoIcms.csosn == "202")
							|| (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "203"))
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
					}

					//  csosn 500
					else if (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "500")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCSTRet", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcmsStRetido.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSSTRet", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsStRetido.toString(), NFeIni);
					}

					//  csosn 900
					else if (nfeDetalhe.nfeDetalheImpostoIcms.csosn == "900")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBC", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pCredSN", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaCreditoIcmsSn.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vCredICMSSN", nfeDetalhe.nfeDetalheImpostoIcms.valorCreditoIcmsSn.toString(), NFeIni);
					}
				}

				else
				{
					Biblioteca.iniWriteString("ICMS" + incrementoBloco, "CST", nfeDetalhe.nfeDetalheImpostoIcms.cstIcms, NFeIni);

					//  00 Tributada integralmente
					if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "00")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
					}

					//  10 Tributada e com cobranca do ICMS por ST
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "10")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
					}

					//  20 Tributada com reducao de base de calculo
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "20")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBC", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
					}

					//  30 Isenta ou nao tributada e com cobranca do ICMS por ST
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "30")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
					}

					//  40 Isenta
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "40")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "motDesICMS", nfeDetalhe.nfeDetalheImpostoIcms.motivoDesoneracaoIcms, NFeIni);
					}

					//  41 Nao tributada
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "41")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "motDesICMS", nfeDetalhe.nfeDetalheImpostoIcms.motivoDesoneracaoIcms, NFeIni);
					}

					//  50 Suspencao
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "50")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "motDesICMS", nfeDetalhe.nfeDetalheImpostoIcms.motivoDesoneracaoIcms, NFeIni);
					}

					//  51 Diferimento preenchimento do ICMS depende da UF
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "51")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBC", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
					}

					//  60 ICMS cobrado anteriormente por ST
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "60")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCSTRet", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcmsStRetido.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSSTRet", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsStRetido.toString(), NFeIni);
					}

					//  70 ICMS com reducao de base de calculo e cobranca de ICMS por ST
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "70")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBC", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
					}

					//  90 Outros
					else if (nfeDetalhe.nfeDetalheImpostoIcms.cstIcms == "90")
					{
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "orig", nfeDetalhe.nfeDetalheImpostoIcms.origemMercadoria, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBC", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcms, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIcms.valorBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBC", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMS", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMS", nfeDetalhe.nfeDetalheImpostoIcms.valorIcms.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "modBCST", nfeDetalhe.nfeDetalheImpostoIcms.modalidadeBcIcmsSt, NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pMVAST", nfeDetalhe.nfeDetalheImpostoIcms.percentualMvaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pRedBCST", nfeDetalhe.nfeDetalheImpostoIcms.percentualReducaoBcIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vBCST", nfeDetalhe.nfeDetalheImpostoIcms.valorBaseCalculoIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "pICMSST", nfeDetalhe.nfeDetalheImpostoIcms.aliquotaIcmsSt.toString(), NFeIni);
						Biblioteca.iniWriteString("ICMS" + incrementoBloco, "vICMSST", nfeDetalhe.nfeDetalheImpostoIcms.valorIcmsSt.toString(), NFeIni);
					}
					/*
						Cabe a cada participante implementar o seguinte:
						ICMSPart partilha do ICMS entre a UF de Origem e UF de Destino..
						ICMSST Repasse de ICMS ST retido anteriormente em ope. interestadual...
					*/
				}

				// / [IPI]
				Biblioteca.iniWriteString("IPI" + incrementoBloco, "CST", nfeDetalhe.nfeDetalheImpostoIpi.cstIpi, NFeIni);
				Biblioteca.iniWriteString("IPI" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIpi.valorBaseCalculoIpi.toString(), NFeIni);
				Biblioteca.iniWriteString("IPI" + incrementoBloco, "pIPI", nfeDetalhe.nfeDetalheImpostoIpi.aliquotaIpi.toString(), NFeIni);
				Biblioteca.iniWriteString("IPI" + incrementoBloco, "vIPI", nfeDetalhe.nfeDetalheImpostoIpi.valorIpi.toString(), NFeIni);

				// / [PIS]
				Biblioteca.iniWriteString("PIS" + incrementoBloco, "CST", nfeDetalhe.nfeDetalheImpostoPis.cstPis, NFeIni);
				Biblioteca.iniWriteString("PIS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoPis.valorBaseCalculoPis.toString(), NFeIni);
				if (nfeDetalhe.nfeDetalheImpostoPis.cstPis == "01")
					Biblioteca.iniWriteString("PIS" + incrementoBloco, "pPIS", nfeDetalhe.nfeDetalheImpostoPis.aliquotaPisPercentual.toString(), NFeIni);
				else if (nfeDetalhe.nfeDetalheImpostoPis.cstPis == "02")
					Biblioteca.iniWriteString("PIS" + incrementoBloco, "pPIS", nfeDetalhe.nfeDetalheImpostoPis.aliquotaPisReais.toString(), NFeIni);
				Biblioteca.iniWriteString("PIS" + incrementoBloco, "vPIS", nfeDetalhe.nfeDetalheImpostoPis.valorPis.toString(), NFeIni);

				// / [COFINS]
				Biblioteca.iniWriteString("COFINS" + incrementoBloco, "CST", nfeDetalhe.nfeDetalheImpostoCofins.cstCofins, NFeIni);
				Biblioteca.iniWriteString("COFINS" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoCofins.baseCalculoCofins.toString(), NFeIni);
				if (nfeDetalhe.nfeDetalheImpostoCofins.cstCofins == "01")
					Biblioteca.iniWriteString("COFINS" + incrementoBloco, "pCOFINS", nfeDetalhe.nfeDetalheImpostoCofins.aliquotaCofinsPercentual.toString(), NFeIni);
				else if (nfeDetalhe.nfeDetalheImpostoCofins.cstCofins == "02")
					Biblioteca.iniWriteString("COFINS" + incrementoBloco, "pCOFINS", nfeDetalhe.nfeDetalheImpostoCofins.aliquotaCofinsReais.toString(), NFeIni);
				Biblioteca.iniWriteString("COFINS" + incrementoBloco, "vCOFINS", nfeDetalhe.nfeDetalheImpostoCofins.valorCofins.toString(), NFeIni);

				// / [II]
				//if (!nfeDetalhe.nfeDetalheImpostoIi.equals(null))
				//{
				//	Biblioteca.iniWriteString("II" + incrementoBloco, "vBC", nfeDetalhe.nfeDetalheImpostoIi.valorBcIi.toString(), NFeIni);
				//	Biblioteca.iniWriteString("II" + incrementoBloco, "vDespAdu", nfeDetalhe.nfeDetalheImpostoIi.valorDespesasAduaneiras.toString(), NFeIni);
				//	Biblioteca.iniWriteString("II" + incrementoBloco, "vII", nfeDetalhe.nfeDetalheImpostoIi.valorImpostoImportacao.toString(), NFeIni);
				//	Biblioteca.iniWriteString("II" + incrementoBloco, "vIOF", nfeDetalhe.nfeDetalheImpostoIi.valorIof.toString(), NFeIni);
				//}

			}
		})

		// *******************************************************************************************
		//   [Total]
		// *******************************************************************************************
		Biblioteca.iniWriteString("Total", "vNF", pNfeCabecalho.valorTotal.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vBC", pNfeCabecalho.baseCalculoIcms.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vICMS", pNfeCabecalho.valorIcms.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vBCST", pNfeCabecalho.baseCalculoIcmsSt.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vST", pNfeCabecalho.valorIcmsSt.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vProd", pNfeCabecalho.valorTotalProdutos.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vFrete", pNfeCabecalho.valorFrete.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vSeg", pNfeCabecalho.valorSeguro.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vDesc", pNfeCabecalho.valorDesconto.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vII", pNfeCabecalho.valorImpostoImportacao.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vIPI", pNfeCabecalho.valorIpi.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vPIS", pNfeCabecalho.valorPis.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vCOFINS", pNfeCabecalho.valorCofins.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vOutro", pNfeCabecalho.valorDespesasAcessorias.toString(), NFeIni);
		Biblioteca.iniWriteString("Total", "vNF", pNfeCabecalho.valorTotal.toString(), NFeIni);

		// *******************************************************************************************
		//   [ISSQNtot]
		// *******************************************************************************************
		Biblioteca.iniWriteString("ISSQNtot", "vServ", pNfeCabecalho.valorServicos.toString(), NFeIni);
		Biblioteca.iniWriteString("ISSQNtot", "vBC", pNfeCabecalho.baseCalculoIssqn.toString(), NFeIni);
		Biblioteca.iniWriteString("ISSQNtot", "vISS", pNfeCabecalho.valorIssqn.toString(), NFeIni);
		Biblioteca.iniWriteString("ISSQNtot", "vPIS", pNfeCabecalho.valorPisIssqn.toString(), NFeIni);
		Biblioteca.iniWriteString("ISSQNtot", "vCOFINS", pNfeCabecalho.valorCofinsIssqn.toString(), NFeIni);

		// *******************************************************************************************
		//   [retTrib]
		// *******************************************************************************************
		Biblioteca.iniWriteString("retTrib", "vRetPIS", pNfeCabecalho.valorRetidoPis.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vRetCOFINS", pNfeCabecalho.valorRetidoCofins.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vRetCSLL", pNfeCabecalho.valorRetidoCsll.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vBCIRRF", pNfeCabecalho.baseCalculoIrrf.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vIRRF", pNfeCabecalho.valorRetidoIrrf.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vBCRetPrev", pNfeCabecalho.baseCalculoPrevidencia.toString(), NFeIni);
		Biblioteca.iniWriteString("retTrib", "vRetPrev", pNfeCabecalho.valorRetidoPrevidencia.toString(), NFeIni);

		// *******************************************************************************************
		//   [PAG]
		// *******************************************************************************************
		Biblioteca.iniWriteString("PAG001", "tpag", "01", NFeIni);
		Biblioteca.iniWriteString("PAG001", "vPag", pNfeCabecalho.valorTotal.toString(), NFeIni);
		Biblioteca.iniWriteString("PAG001", "indPag", "0", NFeIni);
		Biblioteca.iniWriteString("PAG001", "vTroco", "0", NFeIni);

		// *******************************************************************************************
		//   [DadosAdicionais]
		// *******************************************************************************************
		Biblioteca.iniWriteString("DadosAdicionais", "infAdFisco", "", NFeIni);
		Biblioteca.iniWriteString("DadosAdicionais", "infCpl", "", NFeIni);

		const arquivoFinalizado = NFeIni.createINIString();
		fs.writeFileSync(nomeArquivo, arquivoFinalizado);
	}


}