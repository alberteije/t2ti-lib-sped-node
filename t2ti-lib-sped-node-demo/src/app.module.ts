import { Module } from '@nestjs/common';
//import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { configMySQL } from './orm.config';
import { CadastrosModule } from './cadastros/cadastros.module';
//import { FinanceiroModule } from './financeiro/financeiro.module';
//import { EstoqueModule } from './estoque/estoque.module';
import { TributacaoModule } from './tributacao/tributacao.module';
//import { VendasModule } from './vendas/vendas.module';
//import { ComprasModule } from './compras/compras.module';
import { NfeModule } from './nfe/nfe.module';
import { AdministrativoModule } from './administrativo/administrativo.module';
//import { ComissoesModule } from './comissoes/comissoes.module';
//import { OsModule } from './os/os.module';
//import { AfvModule } from './afv/afv.module';
import { SpedModule } from './sped/sped.module';
//import { GedModule } from './ged/ged.module';
//import { ViewsDBModule } from './views-db/views-db.module';

@Module(
  {
    imports: [
//      TypeOrmModule.forRoot(configMySQL),
//      CadastrosModule,
//      FinanceiroModule,
      // EstoqueModule,
      // TributacaoModule,
      // VendasModule,
      // ComprasModule,
//      NfeModule,
//      AdministrativoModule,
      // ComissoesModule,
	    // OsModule,
//	    AfvModule,
		  SpedModule,
//	    GedModule,
//      ViewsDBModule,
    ],
    controllers: [AppController],
    providers: [AppService],
  }
)
export class AppModule { }