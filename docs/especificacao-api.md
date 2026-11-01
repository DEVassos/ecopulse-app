# Especificação das APIs Auxiliares (UniLaunch)

Este documento especifica o contrato e comportamento dos microsserviços externos consumidos pelo EcoPulse.

---

## 1. Greener Metrics Aggregator API
* **URL de Produção:** `https://metrics.unilaunch.org`
* **Descrição:** Microsserviço que simula a infraestrutura corporativa, listando os serviços ativos e fornecendo suas métricas computacionais em tempo real.

### Endpoints
* **`GET /health`**
  * **Descrição:** Verifica a saúde do agregador.
  * **Retorno (200 OK):** `{ "service": "metrics-aggregator", "status": "ok", "uptime_seconds": 122 }`

* **`GET /services`**
  * **Descrição:** Retorna a lista de serviços ativos registrados no momento.
  * **Retorno (200 OK):** Array de `ServiceSummary`
    ```json
    [
      {
        "id": "billing-api",
        "name": "Billing API",
        "location": {
          "region_code": "br-sudeste",
          "country": "Brazil",
          "region": "Sudeste",
          "city": "Sao Paulo",
          "latitude": -23.5505,
          "longitude": -46.6333
        },
        "metrics_path": "/metrics/billing-api"
      }
    ]
    ```

* **`GET /services/{id}`**
  * **Descrição:** Consulta o cadastro individual de um serviço descoberto.
  * **Respostas:** `200 OK` (Serviço encontrado) | `404 Not Found` (Serviço não listado).

* **`GET /metrics/{service_id}`**
  * **Descrição:** Coleta as métricas computacionais instantâneas do serviço.
  * **Respostas:**
    * **`200 OK`:** Métricas coletadas com sucesso.
      ```json
      {
        "collection_interval_seconds": 27,
        "metrics": {
          "cpu_percent": 62.67,
          "memory_gb": 3.17,
          "disk_gb": 19.26,
          "network_gb": 0.45
        }
      }
      ```
    * **`404 Not Found`:** A descrição da resposta menciona serviço removido ou métricas inexistentes.
    * **`500 Internal Server Error`:** Serviço ou exportador indisponível.

  * **Ambiguidade verificada no OpenAPI em 08/10/2026:** a descrição do endpoint afirma que serviço listado sem métricas retorna `500`, enquanto a descrição de `404` também menciona métricas inexistentes. Confirmar com o parceiro; não inferir remoção apenas por HTTP `404`. Falha de `GET /services` não equivale a uma descoberta válida vazia.
  * **Unidades:** `memory_gb`, `disk_gb` e `network_gb` são rotulados GB, sem definição explícita de GB decimal versus GiB. Persistir os valores declarados, sem conversão presumida para bytes. `collection_interval_seconds` é o intervalo daquela coleta; o consumidor deve exigir valor positivo dentro da faixa suportada.

---

## 2. Greener Carbon Intensity API
* **URL de Produção:** `https://carbon.unilaunch.org`
* **Descrição:** Fornece o fator de intensidade de carbono (gCO₂e/kWh) e percentual de fontes renováveis da matriz elétrica regional.

### Endpoints
* **`GET /health`**
  * **Descrição:** Verifica a saúde do serviço.
  * **Retorno (200 OK):** `{ "service": "carbon-intensity", "status": "ok" }`

* **`GET /regions`**
  * **Descrição:** Lista todas as regiões cadastradas e seus fatores regionais.
  * **Retorno (200 OK):** Objeto com `regions` (array com `code`, `country`, `region`, `city`, `latitude`, `longitude`, `carbon_intensity_gco2e_per_kwh` e `renewable_share_percent`) e `total` (inteiro), conforme OpenAPI consultado em 08/10/2026.

* **`GET /regions/{code}/carbon-intensity`** (Alias: `GET /carbon-intensity/{code}`)
  * **Descrição:** Retorna a intensidade de carbono referente ao `region_code` informado.
  * **Retorno (200 OK):**
    ```json
    {
      "region_code": "br-sudeste",
      "country": "Brazil",
      "region": "Sudeste",
      "city": "Sao Paulo",
      "carbon_intensity_gco2e_per_kwh": 85.0,
      "renewable_share_percent": 83.0
    }
    ```
  * **Resposta (404 Not Found):** Região não encontrada no cadastro.
