FROM prom/alertmanager:v0.25.0

COPY alertmanager.yml /etc/alertmanager/alertmanager.yml

USER root
RUN mkdir -p /alertmanager && \
    chown -R nobody:nobody /alertmanager /etc/alertmanager

USER nobody

ENTRYPOINT [ "/bin/alertmanager" ]
CMD        [ "--config.file=/etc/alertmanager/alertmanager.yml", \
             "--storage.path=/alertmanager" ]