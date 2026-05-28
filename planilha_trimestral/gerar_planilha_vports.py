import os
import re
import argparse
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def esforco_para_minutos(texto):
    if not texto or pd.isna(texto):
        return 0

    texto = str(texto).lower()

    horas = re.search(r"(\d+)\s*hora", texto)
    minutos = re.search(r"(\d+)\s*minuto", texto)

    total = 0

    if horas:
        total += int(horas.group(1)) * 60

    if minutos:
        total += int(minutos.group(1))

    return total


def minutos_para_hhmm(minutos):
    if pd.isna(minutos):
        minutos = 0

    horas = int(minutos // 60)
    mins = int(minutos % 60)

    return f"{horas:02d}:{mins:02d}"


def nome_aba_excel(nome):
    nome = "Sem nome" if pd.isna(nome) else str(nome)
    nome = re.sub(r'[\[\]\:\*\?\/\\]', "-", nome)
    nome = nome.strip()
    return nome[:31] or "Sem nome"


def texto_seguro(valor):
    if pd.isna(valor):
        return ""
    return str(valor)


def numero_seguro(valor):
    if pd.isna(valor):
        return 0
    return float(valor)


def extrair_lat_lon(coordenadas):
    if not coordenadas or pd.isna(coordenadas):
        return "", ""

    texto = str(coordenadas)
    numeros = re.findall(r"-?\d+\.\d+|-?\d+", texto)

    if len(numeros) >= 2:
        return numeros[0], numeros[1]

    return "", ""


parser = argparse.ArgumentParser()
parser.add_argument("--inicio", required=True)
parser.add_argument("--fim", required=True)
parser.add_argument("--saida", default=None)
parser.add_argument("--status", default="approved")
args = parser.parse_args()

saida = args.saida or f"relatorios/Vports_{args.inicio}_a_{args.fim}.xlsx"

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)

query = """
SELECT
  d.id,
  d.local_desembarque,
  COALESCE(NULLIF(d.arte_pesca, ''), d.outro_arte_pesca) AS arte_pesca,
  d.data_retorno::date AS data_retorno,
  d.esforco,
  d.coordenadas,
  item->>'especie' AS especie,
  (item->>'quantidade')::numeric AS captura_kg,
  (item->>'valor_kg')::numeric AS valor_kg,
  ((item->>'quantidade')::numeric * (item->>'valor_kg')::numeric) AS valor_total
FROM desembarques d
CROSS JOIN LATERAL jsonb_array_elements(d.especies::jsonb) AS item
WHERE d.data_retorno::date BETWEEN %(inicio)s AND %(fim)s
  AND d.status = %(status)s
  AND d.especies IS NOT NULL
ORDER BY d.local_desembarque, item->>'especie';
"""

df = pd.read_sql_query(
    query,
    conn,
    params={
        "inicio": args.inicio,
        "fim": args.fim,
        "status": args.status,
    },
)

conn.close()

if df.empty:
    print("Nenhum dado encontrado para o período.")
    exit()

df["esforco_minutos"] = df["esforco"].apply(esforco_para_minutos)

os.makedirs(os.path.dirname(saida) or ".", exist_ok=True)

with pd.ExcelWriter(saida, engine="xlsxwriter") as writer:
    workbook = writer.book

    header_fmt = workbook.add_format({
        "bold": True,
        "bg_color": "#0E3446",
        "font_color": "white",
        "align": "center",
        "valign": "vcenter",
        "border": 1,
        "text_wrap": True,
    })

    cell_fmt = workbook.add_format({
        "border": 1,
        "align": "center",
        "valign": "vcenter",
    })

    money_fmt = workbook.add_format({
        "border": 1,
        "align": "center",
        "num_format": 'R$ #,##0.00',
    })

    percent_fmt = workbook.add_format({
        "border": 1,
        "align": "center",
        "num_format": "0.00%",
    })

    title_fmt = workbook.add_format({
        "bold": True,
        "bg_color": "#0E3446",
        "font_color": "white",
        "align": "center",
        "border": 1,
    })

    locais = sorted(df["local_desembarque"].dropna().unique())

    for local in locais:
        sheet_name = nome_aba_excel(local)
        ws = workbook.add_worksheet(sheet_name)

        local_df = df[df["local_desembarque"] == local].copy()

        total_kg = local_df["captura_kg"].sum()
        total_valor = local_df["valor_total"].sum()
        total_desembarques = local_df["id"].nunique()
        total_esforco = local_df.drop_duplicates("id")["esforco_minutos"].sum()
        total_dias = local_df["data_retorno"].nunique()

        agrupado = (
            local_df
            .groupby("especie", dropna=False)
            .agg(
                captura_kg=("captura_kg", "sum"),
                valor_total=("valor_total", "sum"),
                numero_desembarques=("id", "nunique"),
                data=("data_retorno", "max"),
                esforco_minutos=("esforco_minutos", "sum"),
                arte_pesca=(
                    "arte_pesca",
                    lambda x: ", ".join(
                        sorted(
                            set(
                                str(v).strip()
                                for v in x
                                if not pd.isna(v) and str(v).strip()
                            )
                        )
                    ),
                ),
            )
            .reset_index()
        )

        agrupado["preco_medio_kg"] = agrupado["valor_total"] / agrupado["captura_kg"]
        agrupado["participacao"] = agrupado["captura_kg"] / total_kg if total_kg > 0 else 0
        agrupado["esforco_hhmm"] = agrupado["esforco_minutos"].apply(minutos_para_hhmm)

        headers = [
            "Espécie",
            "Captura (Kg)",
            "Preço médio por Kilo (R$)",
            "Número de desembarques",
            "Arte de Pesca",
            "Participação da espécie (%)",
            "",
            "Resumo",
            "",
            "Data",
            "Esforço (hh:mm)",
        ]

        for col, header in enumerate(headers):
            ws.write(0, col, header, header_fmt)

        row = 1

        for _, r in agrupado.iterrows():
            ws.write(row, 0, texto_seguro(r["especie"]), cell_fmt)
            ws.write_number(row, 1, numero_seguro(r["captura_kg"]), cell_fmt)
            ws.write_number(row, 2, numero_seguro(r["preco_medio_kg"]), money_fmt)
            ws.write_number(row, 3, int(numero_seguro(r["numero_desembarques"])), cell_fmt)
            ws.write(row, 4, texto_seguro(r["arte_pesca"]), cell_fmt)
            ws.write_number(row, 5, numero_seguro(r["participacao"]), percent_fmt)
            ws.write(row, 9, texto_seguro(r["data"]), cell_fmt)
            ws.write(row, 10, texto_seguro(r["esforco_hhmm"]), cell_fmt)
            row += 1

        resumo_linhas = [
            ["Total de dias de desembarque no período", total_dias],
            ["Total de desembarques", total_desembarques],
            ["Total de kilos capturados no período", total_kg],
            ["Valor no período (R$)", total_valor],
            ["CPUE do período", ""],
            ["Esforço total", minutos_para_hhmm(total_esforco)],
        ]

        ws.write(1, 7, "Resumo", title_fmt)
        ws.write(1, 8, "", title_fmt)

        for i, linha in enumerate(resumo_linhas, start=2):
            ws.write(i, 7, linha[0], cell_fmt)

            if "Valor" in linha[0]:
                ws.write_number(i, 8, numero_seguro(linha[1]), money_fmt)
            elif isinstance(linha[1], (int, float)):
                ws.write_number(i, 8, numero_seguro(linha[1]), cell_fmt)
            else:
                ws.write(i, 8, texto_seguro(linha[1]), cell_fmt)

        resumo_desembarque = (
            local_df
            .groupby("data_retorno")
            .agg(qtd=("id", "nunique"))
            .reset_index()
        )

        ws.write(9, 7, "Resumo do desembarque", title_fmt)
        ws.write(10, 7, "Data", header_fmt)
        ws.write(10, 8, "Qtde", header_fmt)

        for idx, r in resumo_desembarque.iterrows():
            ws.write(11 + idx, 7, texto_seguro(r["data_retorno"]), cell_fmt)
            ws.write_number(11 + idx, 8, int(numero_seguro(r["qtd"])), cell_fmt)

        ws.set_column("A:A", 22)
        ws.set_column("B:B", 14)
        ws.set_column("C:C", 20)
        ws.set_column("D:D", 18)
        ws.set_column("E:E", 45)
        ws.set_column("F:F", 22)
        ws.set_column("G:G", 4)
        ws.set_column("H:H", 34)
        ws.set_column("I:I", 16)
        ws.set_column("J:J", 14)
        ws.set_column("K:K", 16)

        ws.freeze_panes(1, 0)

    # Aba Mapa de pesca
    ws_mapa = workbook.add_worksheet("Mapa de pesca")

    mapa_headers = [
        "Local de desembarque",
        "Espécie",
        "Captura (Kg)",
        "Valor total (R$)",
        "Arte de Pesca",
        "Data",
        "Coordenadas",
        "Latitude",
        "Longitude",
    ]

    for col, header in enumerate(mapa_headers):
        ws_mapa.write(0, col, header, header_fmt)

    mapa_df = (
        df
        .groupby(["local_desembarque", "especie", "coordenadas"], dropna=False)
        .agg(
            captura_kg=("captura_kg", "sum"),
            valor_total=("valor_total", "sum"),
            arte_pesca=(
                "arte_pesca",
                lambda x: ", ".join(
                    sorted(
                        set(
                            str(v).strip()
                            for v in x
                            if not pd.isna(v) and str(v).strip()
                        )
                    )
                ),
            ),
            data=("data_retorno", "max"),
        )
        .reset_index()
    )

    row = 1

    for _, r in mapa_df.iterrows():
        lat, lon = extrair_lat_lon(r["coordenadas"])

        ws_mapa.write(row, 0, texto_seguro(r["local_desembarque"]), cell_fmt)
        ws_mapa.write(row, 1, texto_seguro(r["especie"]), cell_fmt)
        ws_mapa.write_number(row, 2, numero_seguro(r["captura_kg"]), cell_fmt)
        ws_mapa.write_number(row, 3, numero_seguro(r["valor_total"]), money_fmt)
        ws_mapa.write(row, 4, texto_seguro(r["arte_pesca"]), cell_fmt)
        ws_mapa.write(row, 5, texto_seguro(r["data"]), cell_fmt)
        ws_mapa.write(row, 6, texto_seguro(r["coordenadas"]), cell_fmt)
        ws_mapa.write(row, 7, lat, cell_fmt)
        ws_mapa.write(row, 8, lon, cell_fmt)

        row += 1

    ws_mapa.set_column("A:A", 28)
    ws_mapa.set_column("B:B", 24)
    ws_mapa.set_column("C:C", 14)
    ws_mapa.set_column("D:D", 18)
    ws_mapa.set_column("E:E", 45)
    ws_mapa.set_column("F:F", 14)
    ws_mapa.set_column("G:G", 35)
    ws_mapa.set_column("H:I", 16)

    ws_mapa.freeze_panes(1, 0)

print(f"Planilha gerada com sucesso: {saida}")