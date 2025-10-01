FROM prom/prometheus:v2.43.0

COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY rules/alert_rules.yml /etc/prometheus/rules/alert_rules.yml

USER root
RUN mkdir -p /prometheus && \
    chown -R nobody:nobody /prometheus /etc/prometheus

USER nobody

ENTRYPOINT [ "/bin/prometheus" ]
CMD        [ "--config.file=/etc/prometheus/prometheus.yml", \
             "--storage.tsdb.path=/prometheus", \
             "--web.console.libraries=/etc/prometheus/console_libraries", \
             "--web.console.templates=/etc/prometheus/consoles", \
             "--web.enable-lifecycle" ]