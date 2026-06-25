# Finanzas Spring

Backend Spring Boot + Hibernate para el frontend de finanzas.

## Requisitos

- WSL Ubuntu
- Java 21 en Ubuntu
- Docker en Ubuntu

## Entrar al proyecto desde WSL

```powershell
wsl -d Ubuntu
```

```bash
cd /mnt/c/Users/usuario/Documents/Pickster/finanzas-spring
```

## Levantar base de datos en WSL

```bash
docker compose up -d
```

PostgreSQL queda expuesto en `localhost:5433`.

## Validar compilacion

```bash
./mvnw test
```

## Levantar aplicacion en WSL

```bash
./mvnw spring-boot:run
```

Abrir:

```text
http://localhost:8080
```

Si el puerto `8080` ya esta ocupado, usa otro puerto:

```bash
PORT=8081 ./mvnw spring-boot:run
```

Y abre:

```text
http://localhost:8081
```

La app sirve el frontend con Thymeleaf en `/` y expone la API en `/api/finance`.

## Variables opcionales

```text
DATABASE_URL=jdbc:postgresql://localhost:5433/finanzas
DATABASE_USERNAME=finanzas
DATABASE_PASSWORD=finanzas
PORT=8080
```
