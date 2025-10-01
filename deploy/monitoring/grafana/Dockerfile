FROM grafana/grafana:9.5.1

COPY ./provisioning/datasources /etc/grafana/provisioning/datasources
COPY ./provisioning/dashboards /etc/grafana/provisioning/dashboards
COPY ./dashboards /var/lib/grafana/dashboards

USER root
RUN mkdir -p /var/lib/grafana/dashboards && \
    chown -R grafana:grafana /var/lib/grafana /etc/grafana

USER grafana

ENV GF_INSTALL_PLUGINS="grafana-piechart-panel,grafana-worldmap-panel"